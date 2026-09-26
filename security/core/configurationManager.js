const fs = require("fs");
const path = require("path");

class ConfigurationManager {
    constructor() {
        this.configPath = path.join(
            __dirname,
            "..",
            "config",
            "scanner-config.json"
        );
    }

    loadConfiguration() {
        try {
            const configData = fs.readFileSync(this.configPath, "utf8");
            return JSON.parse(configData);
        } catch (error) {
            throw new Error(
                `Unable to load scanner configuration: ${error.message}`
            );
        }
    }
}

module.exports = ConfigurationManager;