# Changelog

## [0.5.0](https://github.com/chenhunghan/0ma/compare/v0.4.5...v0.5.0) (2026-04-03)


### Features

* add AI icon generation script with macOS squircle support ([b40d9ad](https://github.com/chenhunghan/0ma/commit/b40d9adbd23bcf3de655c9fd2ee7fa0eda5cef21))
* add app icon to README and website hero ([68c3ffb](https://github.com/chenhunghan/0ma/commit/68c3ffb6fe8c1f43cd83a570678da10d2fca0ef7))
* add Lima installation check and auto-install banner for missing dependencies ([0812f8a](https://github.com/chenhunghan/0ma/commit/0812f8abf77d964a67f93cb5e47548e05ace2121))
* add marketing website with interactive app demos ([4a8e76e](https://github.com/chenhunghan/0ma/commit/4a8e76e0f2e3aef308a5bd258aa8e28d78583296))
* add tray icon generation script and generate new tray icon ([e02842d](https://github.com/chenhunghan/0ma/commit/e02842dec210a0eee671679b21aaeb323419d6d0))
* implement auto-updater functionality with tray integration and automated release workflows ([4bae068](https://github.com/chenhunghan/0ma/commit/4bae0686a510c9486c963653e61f55e6a150a374))
* **website:** force desktop layout in demos on mobile viewports ([fe86bc7](https://github.com/chenhunghan/0ma/commit/fe86bc77f7f55f805992210124bd25bd864d9558))


### Bug Fixes

* reduce tray icon font size and weight for better visual balance ([6d89f49](https://github.com/chenhunghan/0ma/commit/6d89f49d1a916e5303690a00977973275a8ec71f))
* use Apple's exact macOS icon spec (100px margin, 824x824 squircle) ([6a3920e](https://github.com/chenhunghan/0ma/commit/6a3920e874055911b71dd031237e3fbf5e4e01b3))
* use pixel-perfect macOS squircle margin (72px measured from system icons) ([ca73af4](https://github.com/chenhunghan/0ma/commit/ca73af4cca428af888b313dac3e6b5399a8e59a7))

## [0.4.5](https://github.com/chenhunghan/0ma/compare/v0.4.4...v0.4.5) (2026-03-01)


### Bug Fixes

* remove unused Cargo workspace and cargo-workspace plugin ([2aa386e](https://github.com/chenhunghan/0ma/commit/2aa386e41fd509a0c4a83908c1e62199b1984240))

## [0.4.4](https://github.com/chenhunghan/0ma/compare/v0.4.3...v0.4.4) (2026-03-01)


### Bug Fixes

* fix release workflow outputs for root package path ([2b8074c](https://github.com/chenhunghan/0ma/commit/2b8074c61035eeb163fa47b770b0768ca50e6c24))

## [0.4.3](https://github.com/chenhunghan/0ma/compare/v0.4.2...v0.4.3) (2026-03-01)


### Bug Fixes

* fix release me watch path ([b5867fe](https://github.com/chenhunghan/0ma/commit/b5867feebe8959248e21a1675c65126c80a7d7ed))
* reconfigure release-please to watch all repo paths ([4bbc92e](https://github.com/chenhunghan/0ma/commit/4bbc92e44e9db107bdcc3ba6cb1c6d27fd476cff))
* write env.sh after instance fully provisioned ([733cda5](https://github.com/chenhunghan/0ma/commit/733cda5c3384aeeff7bb7cbd18c535da51234df8))

## [0.4.2](https://github.com/chenhunghan/0ma/compare/v0.4.1...v0.4.2) (2026-03-01)


### Bug Fixes

* detect k8s availability server-side when writing env.sh ([acabbce](https://github.com/chenhunghan/0ma/commit/acabbce20f808590cd7c2085224447c745899080))

## [0.4.1](https://github.com/chenhunghan/0ma/compare/v0.4.0...v0.4.1) (2026-03-01)


### Bug Fixes

* restore shell PATH when launched from Finder ([5544ecb](https://github.com/chenhunghan/0ma/commit/5544ecb7677c907d5039e2f77601798481ce59ed))

## [0.4.0](https://github.com/chenhunghan/0ma/compare/v0.3.0...v0.4.0) (2026-03-01)


### Features

* add Rosetta support for x86_64 emulation on ARM hosts ([#21](https://github.com/chenhunghan/0ma/issues/21)) ([a1c158d](https://github.com/chenhunghan/0ma/commit/a1c158ded6f55770c2ed8fbcaded2181e792e08f))

## [0.3.0](https://github.com/chenhunghan/0ma/compare/v0.2.0...v0.3.0) (2026-03-01)


### Features

* support Intel Mac builds and dual-arch Lima images ([1f36d03](https://github.com/chenhunghan/0ma/commit/1f36d03cf3f9c26558c991b68995daa623f29020))

## [0.2.0](https://github.com/chenhunghan/0ma/compare/v0.1.0...v0.2.0) (2026-02-28)


### Features

* Add `is_window_visible` and `is_window_focused` fields to `AppState` for tracking window state. ([cadb8ac](https://github.com/chenhunghan/0ma/commit/cadb8ac4564aeee8ddd7a862c85711089f5371eb))
* add cleanup_env_on_delete function to remove environment variables and symlink on instance deletion ([67cacfa](https://github.com/chenhunghan/0ma/commit/67cacfaa7b0b03a5f8032ee75f2a1da725817040))
* add Docker installation and socket forwarding to Lima configuration ([c8f553b](https://github.com/chenhunghan/0ma/commit/c8f553b27a4d03101e383c16f75c6f8ab3ba9194))
* Add Docker-only Lima config generator (no k0s/Kubernetes) ([b71c40b](https://github.com/chenhunghan/0ma/commit/b71c40b73f4c2db7dbb762b58ffdbba8b05a4058))
* add dynamic kubeconfig context naming to Lima setup scripts ([ce187a6](https://github.com/chenhunghan/0ma/commit/ce187a600e216c2bb7fffd367a2b4b49062f9d48))
* add environment setup functionality with env.sh management ([8428529](https://github.com/chenhunghan/0ma/commit/84285295f65808434bfd94d9260644e31d7808a3))
* add krunkit support ([#8](https://github.com/chenhunghan/0ma/issues/8)) ([b8850d0](https://github.com/chenhunghan/0ma/commit/b8850d01a95e67b0056fc039bbf94e05fcce656a))
* Add Lima instance service for starting and stopping instances with streamed output and event emission. ([078cbbb](https://github.com/chenhunghan/0ma/commit/078cbbb61731d2ee07600ce4b54d7f659eecdf3c))
* Add logic to detect VM shutdown from output and emit a success event. ([bb68718](https://github.com/chenhunghan/0ma/commit/bb687186b003e08acf9e2874aa4216485285e162))
* Add optional Helm and Local Path Provisioner installation to default k0s Lima config, controlled by new UI checkboxes. ([5d97da1](https://github.com/chenhunghan/0ma/commit/5d97da10bf9cfe925f3398396fa0e123c176e788))
* add orphaned environment entries detection and cleanup functionality ([0c783ed](https://github.com/chenhunghan/0ma/commit/0c783ed056d666c02199d6a1db177b4f5a5dfd3e))
* Add read-only instance info panel to Lima tab left column ([361d9a5](https://github.com/chenhunghan/0ma/commit/361d9a54ee6675b03d02cae1d2be8b08fdcce12b))
* add Tauri store plugin ([84acd5d](https://github.com/chenhunghan/0ma/commit/84acd5dd9d99f45a92ca0a706ea05ade6ab2e77e))
* add Tauri store plugin ([137d197](https://github.com/chenhunghan/0ma/commit/137d19740a379411e55386f0c1e9292983e811d2))
* Add terminal scroll on user input and refactor input handling to use event-based communication for improved latency. ([0eab466](https://github.com/chenhunghan/0ma/commit/0eab466da151dd03280b59b53a4638b8d1e616f7))
* Add terminal title integration for Lima shell sessions ([029a60d](https://github.com/chenhunghan/0ma/commit/029a60d2b21fa7e67e4413746141f26b5b5a4824))
* Add window focus state tracking and update window visibility on focus changes. ([0f334bc](https://github.com/chenhunghan/0ma/commit/0f334bc2912d12d975a69c05a0f4a7c8c2dea3b3))
* Add window hide/show functionality with dynamic tray menu updates. ([4f77bb8](https://github.com/chenhunghan/0ma/commit/4f77bb8425a141574c2ee925b94984a42432d0de))
* Copy k0s admin kubeconfig from guest to host for kubectl access ([39e7496](https://github.com/chenhunghan/0ma/commit/39e74967983e42eea19d1a3d239c41d9ad14b3d9))
* Dynamic terminal tab names from running process ([05f02e4](https://github.com/chenhunghan/0ma/commit/05f02e4cfd86e32769e42864145027601d34c0f8))
* ensure Lima user has access to Docker socket ([e5fffcb](https://github.com/chenhunghan/0ma/commit/e5fffcbf74415087fee49e133727f8f21ca06956))
* Hide K8s tab when Kubernetes is not installed in the VM ([96ec26c](https://github.com/chenhunghan/0ma/commit/96ec26c718f2c86e4602e0f3ff685b46ce6ae016))
* Implement a new UI dialog for stopping Lima instances with real-time log display and enhanced backend event emission. ([9553bc8](https://github.com/chenhunghan/0ma/commit/9553bc8c946b30eb16cab97e1cd7f966c4d20a81))
* Implement detailed Lima instance creation log streaming with unique event IDs and timestamps. ([5f578ca](https://github.com/chenhunghan/0ma/commit/5f578caa953eb4483b8cbdf8bdf8fc1b38434754))
* Implement native terminal sessions using a Tauri PTY manager and a new `TerminalComponent`. ([ac644f4](https://github.com/chenhunghan/0ma/commit/ac644f44f772103222d1d573606fb9ed696b643e))
* Implement system tray icon with basic menu actions and add a script for icon processing. ([67aa73a](https://github.com/chenhunghan/0ma/commit/67aa73a326ef35226c3af44af36709acfce83fda))
* Improve default k0s Lima configuration for host access via kubeconfig and port forwarding, and update product name. ([d0ee885](https://github.com/chenhunghan/0ma/commit/d0ee885205c6f44d239c8d4b7cbb791661820fe8))
* increase default window dimensions and add minimum size constraints ([79f8573](https://github.com/chenhunghan/0ma/commit/79f8573ca4d06632312ce30a780f4ab89dcf0d4b))
* integrate `FrankenTerm` as the terminal library, replacing xterm.js ([#5](https://github.com/chenhunghan/0ma/issues/5)) ([47cb7fa](https://github.com/chenhunghan/0ma/commit/47cb7fa3707f00fdb71b30ee30728bb60a8bab4a))
* Integrate Tauri log plugin for improved logging capabilities. ([3179819](https://github.com/chenhunghan/0ma/commit/31798192ef1e5d7e58b9ff91c580d99e755ac8e3))
* Introduce `useOnLimaStartLogs` hook for tracking Lima instance start logs and standardize backend log payloads. ([5718022](https://github.com/chenhunghan/0ma/commit/57180228ce0be835e39cff40af75abe63022bab8))
* Introduce dynamic tray menu with Lima instance actions and refresh on hover or instance events. ([a7a30b9](https://github.com/chenhunghan/0ma/commit/a7a30b9aa57db0fa5e83fc56bea30f92ee2ed26d))
* Refactor tray icon setup and event handling into `tray_handler.rs`, adding instance management actions and refresh debouncing. ([9d57966](https://github.com/chenhunghan/0ma/commit/9d57966a6f8a50670262d196034128cd57376808))
* remove GPU configuration from LimaConfig and related components for simplification ([41d13c4](https://github.com/chenhunghan/0ma/commit/41d13c4223c3bf312ef2183f27822d62303a7b81))
* Remove terminal session persistence functionality and associated disk operations. ([39851a8](https://github.com/chenhunghan/0ma/commit/39851a87f33e1c0d4677dd18ea3fa11564e45fd1))
* remove unnecessary window properties from tauri configuration ([0eca318](https://github.com/chenhunghan/0ma/commit/0eca31852c56c52b347eb26011a62fd2a17c4d81))
* send instance on instance create events ([d06bccb](https://github.com/chenhunghan/0ma/commit/d06bccb1797772e74fe076a778c1a833f2e18ee6))
* update Docker socket access logic to detect the first non-root user ([888c4e3](https://github.com/chenhunghan/0ma/commit/888c4e33ac06267715a01a0f8707aa6cd61a1c39))
* update Docker socket access logic to use host username instead of detecting first non-root user ([e4e18be](https://github.com/chenhunghan/0ma/commit/e4e18bec1379ee80f204455b9ecd55baf0a86815))
* update window properties in tauri configuration and enhance TopBar styling ([86b0cd0](https://github.com/chenhunghan/0ma/commit/86b0cd0d1c38517d886a949962e6a8eaedb6ea0a))


### Bug Fixes

* Disable TTY allocation for `limactl create`, `start`, and `stop` commands. ([10d71cf](https://github.com/chenhunghan/0ma/commit/10d71cf82fab1deb613a03ad08cb96a7de99792e))
* Emit ready event for Docker-only templates ([#13](https://github.com/chenhunghan/0ma/issues/13)) ([b820ce9](https://github.com/chenhunghan/0ma/commit/b820ce922e73cef939b08eaa008f83bb1fc398f2))
* Emit ready event on success when no probes exist ([b820ce9](https://github.com/chenhunghan/0ma/commit/b820ce922e73cef939b08eaa008f83bb1fc398f2))
* Improve env.sh existence check and streamline write operation in useEnvSetup hook ([fd8e391](https://github.com/chenhunghan/0ma/commit/fd8e391b1c7e31a371e6c5bcf5fd81563d5d7e79))
* Integrate k8s availability check into environment setup and update dialog description ([3795563](https://github.com/chenhunghan/0ma/commit/37955637e9793e533f94c35b50acf81e8d4610cf))
* make kubeconfig context renaming case-insensitive by using `[Dd]efault` in sed commands. ([0eb7448](https://github.com/chenhunghan/0ma/commit/0eb744888cc0c22ef34f113bd1409b956f2fec64))
* Override Docker socket group for Lima user to ensure proper access after group change ([878b03a](https://github.com/chenhunghan/0ma/commit/878b03a7b963381686e0ec466c219ee149b9465a))
* Prevent limactl commands from blocking by explicitly setting stdin to null. ([9486a0a](https://github.com/chenhunghan/0ma/commit/9486a0a3141666ae229dd7842ba5670db1117d3f))
* recursive rust aliasing errors ([#6](https://github.com/chenhunghan/0ma/issues/6)) ([5d57dfc](https://github.com/chenhunghan/0ma/commit/5d57dfcf4cc0622126aa700ffb41b2c3f4adb443))
* resolve Docker socket EOF error caused by group membership race condition ([13152bd](https://github.com/chenhunghan/0ma/commit/13152bd2e8d5015ee6e6bdc5e615d7ffb0213560))
* set TERM and PROMPT_EOL_MARK environment variables for improved terminal compatibility ([b5c89a7](https://github.com/chenhunghan/0ma/commit/b5c89a7174b815aacc328bb397a9d5c56647d595))
* Show actual limactl stderr in error messages instead of opaque exit codes ([f2ecbd2](https://github.com/chenhunghan/0ma/commit/f2ecbd2cb552ee013e43ea6f3e4c30a7ce14d5e0))
* update kubeconfig path to use Lima instance directory ([87afe22](https://github.com/chenhunghan/0ma/commit/87afe2239a6f2ca2bac82238741eb4d70da41e84))
* Update write_env_sh_cmd to accept k8s availability and adjust related hooks ([dbe0180](https://github.com/chenhunghan/0ma/commit/dbe01801bed12f8903092a5f6b2378f55ee15b9d))


### Performance Improvements

* immediately flush terminal writer to prevent input lag ([335c02b](https://github.com/chenhunghan/0ma/commit/335c02b58a15a00a7bfd2e31846d4b1a52e866f9))
