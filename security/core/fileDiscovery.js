const fs = require("fs");
const path = require("path");

class FileDiscovery {
    constructor(configuration) {
        this.configuration = configuration;
    }

    discoverFiles() {
        const discoveredFiles = [];

        this.configuration.scanDirectories.forEach((directory) => {
            const directoryPath = path.join(process.cwd(), directory);

            if (!fs.existsSync(directoryPath)) {
                console.log(`Directory not found: ${directory}`);
                return;
            }

            console.log(`Scanning: ${directory}`);

            this.scanDirectory(directoryPath, discoveredFiles);
        });

        return discoveredFiles;
    }

    scanDirectory(directoryPath, discoveredFiles) {
        const entries = fs.readdirSync(directoryPath, {
            withFileTypes: true
        });

        entries.forEach((entry) => {
            const entryPath = path.join(directoryPath, entry.name);

            if (entry.isDirectory()) {
                if (
                    !this.configuration.excludedDirectories.includes(
                        entry.name
                    )
                ) {
                    this.scanDirectory(entryPath, discoveredFiles);
                }

                return;
            }

            if (
                entry.isFile() &&
                this.configuration.supportedExtensions.includes(
                    path.extname(entry.name)
                )
            ) {
                discoveredFiles.push(entryPath);
            }
        });
    }
}

module.exports = FileDiscovery;