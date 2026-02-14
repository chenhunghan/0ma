FRANKENTUI_REPO := https://github.com/chenhunghan/frankentui.git
FRANKENTUI_BRANCH := fix/shadow-cells-resize-sync
VENDOR_DIR := vendor/frankentui
WASM_OUT := src/wasm/frankenterm-web

.PHONY: setup wasm dev build icon clean

## First-time setup: clone vendor + install deps + build WASM
setup: vendor node_modules wasm

## Build WASM from vendor source
wasm: vendor
	RUSTFLAGS="--cfg=web_sys_unstable_apis" wasm-pack build \
		--target web \
		--out-dir $(CURDIR)/$(WASM_OUT) \
		--out-name FrankenTerm \
		$(VENDOR_DIR)/crates/frankenterm-web

## Start Tauri dev server
dev: $(WASM_OUT)/FrankenTerm.js node_modules
	cargo tauri dev

## Production build (requires icons — run `make icon` first)
build: $(WASM_OUT)/FrankenTerm.js node_modules src-tauri/icons
	cargo tauri build

## Generate app icons from a source image: make icon SRC=path/to/icon.png
icon:
	cargo tauri icon $(SRC)

src-tauri/icons:
	@echo "Icons missing. Run: make icon SRC=path/to/icon.png"
	@exit 1

## Clone frankentui into vendor/
vendor:
	git clone --branch $(FRANKENTUI_BRANCH) --single-branch --depth 1 \
		$(FRANKENTUI_REPO) $(VENDOR_DIR)

## Install npm dependencies
node_modules: package.json
	npm install
	@touch node_modules

## Remove all generated files
clean:
	rm -rf $(VENDOR_DIR) $(WASM_OUT) node_modules
