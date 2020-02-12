// Made by xboxfly15 - 04/08/2019
var cloudFlareAccountEmail = 'example@exmaple.com';
var cloudFlareAccountAPIKey = 'Top secret CloudFlare API key';
var cloudFlareZoneID = '023e105f4ecef8ad9ca31a8372d0c353';
var cloudFlareDNSRecordID = '051d526a2hdny6di2bf64g5625u1m031';
var cloudFlareDNSSubdomain = 'mc'; // People connect to the server via mc.example.com

var failbackServerIP = '123.123.123.123';
//var failbackServerPort = 25570;
var failbackServerAddress = failbackServerIP+':'+25565; // Do not change
var isDNSSetToFailback = false; // Do not change - true = DNS changed to failback, false = DNS hasn't been changed/should be primary

var pausePings = false; // Do not change
var fails = 0; // Do not change
var failsEqualsToDNSSwitch = 3;

var primaryServerIP = '222.222.222.222';
//var primaryServerPort = 25565;
var primaryServerAddress = primaryServerIP+':'+25565; // Do not change
var mcServerTimeout = 3000; // 3 seconds
var pingRepeatTime = 3000; // 3 seconds

const mcping = require('mc-ping-updated');
const cf = require('cloudflare')({ email: cloudFlareAccountEmail, key: cloudFlareAccountAPIKey });

setInterval(() => {
    if (pausePings) return;
    // Repeat ping every x milliseconds
    mcping(primaryServerIP, 25565, async function(err, res) {
        if (err) {
            // Some kind of error
            console.error('Server returned error: ', err);
            if (err.message === 'Socket timed out when connecting to '+primaryServerAddress) {
                fails++;
                if (fails >= failsEqualsToDNSSwitch && !isDNSSetToFailback) {
                    await switchDNS();
                }
            }
        } else {
            // Success!
            console.log('Server is online!');
            if (fails > 0 && isDNSSetToFailback) {
                await switchDNS();
            }
        }
    }, mcServerTimeout);
}, pingRepeatTime);

async function switchDNS() {
    const address = isDNSSetToFailback ? primaryServerIP : failbackServerIP; // True = primaryServerIP, false = failbackServerIP
    const record = '{"type":"A","name":"'+cloudFlareDNSSubdomain+'","content":"'+address+'","ttl":{},"proxied":false}';
    pausePings = true; // Pause the pings in case the CF API is lagging behind/fails and takes longer then 3 seconds, to prevent more CF API requests
    var response = await cf.dnsRecords.edit(cloudFlareZoneID, cloudFlareDNSRecordID, record);
    console.log(resp);
    if (isDNSSetToFailback)
        console.log('DNS changed to primary');
    else
        console.log('DNS changed to failback');
    isDNSSetToFailback = !isDNSSetToFailback;
    fails = 0;
    pausePings = false;
}

console.log('Started pinging '+primaryServerAddress+' every '+mcServerTimeout+'ms');