const ConfigurationManager = require("./configurationManager");

try {
    const configurationManager = new ConfigurationManager();
    const configuration = configurationManager.loadConfiguration();

    console.log("Scanner configuration loaded successfully:");
    console.log(configuration);
} catch (error) {
    console.error(error.message);
}