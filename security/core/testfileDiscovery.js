const ConfigurationManager = require("./configurationManager");
const FileDiscovery = require("./fileDiscovery");

try {
    const configurationManager = new ConfigurationManager();
    const configuration = configurationManager.loadConfiguration();

    const fileDiscovery = new FileDiscovery(configuration);
    
    const files = fileDiscovery.discoverFiles();

    console.log("\nDiscovered Files:");
    console.log(files);

} catch (error) {
    console.error(error.message);
}
