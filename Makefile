.PHONY: dev build icon clean

## Start Tauri dev server
dev: node_modules
	cargo tauri dev

## Production build (requires icons — run `make icon` first)
build: node_modules src-tauri/icons
	cargo tauri build

## Generate app icons from a source image: make icon SRC=path/to/icon.png
icon:
	cargo tauri icon $(SRC)

src-tauri/icons:
	@echo "Icons missing. Run: make icon SRC=path/to/icon.png"
	@exit 1

## Install npm dependencies
node_modules: package.json
	npm install
	@touch node_modules

## Remove all generated files
clean:
	rm -rf node_modules
