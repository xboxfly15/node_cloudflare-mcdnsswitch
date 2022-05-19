require('dotenv-safe').config()
const cf = require('cloudflare')({ email: process.env.CLOUDFLARE_ACCOUNT_EMAIL, key: process.env.CLOUDFLARE_ACCOUNT_API_KEY })
const mcping = require('mcping-js')
const settings = require('./settings.json')
const server = new mcping.MinecraftServer(settings.primaryServerIP, 25565)

// true = DNS changed to failback, false = DNS hasn't been changed/should be primary
let isDNSSetToFailback = false
let pausePings = false
let fails = 0

// Repeat ping every x milliseconds
setInterval(() => {
  if (pausePings) return

  server.ping(settings.mcServerTimeout, 757, async (err, res) => {
    if (err) {
      // Some kind of error
      console.error('Server returned error: ', err)
      fails++
      if (fails >= settings.failsEqualsToDNSSwitch && !isDNSSetToFailback) {
        await switchDNS()
      }
      return
    }

    // Success!
    console.log('Server is online!')
    if (fails > 0 && isDNSSetToFailback) {
      await switchDNS()
    }
  })
}, settings.pingRepeatTime)

async function switchDNS() {
  // true = primaryServerIP, false = failbackServerIP
  const address = isDNSSetToFailback ? settings.primaryServerIP : settings.failbackServerIP
  const record = `{"type":"A","name":"${settings.cloudFlareDNSSubdomain}","content":"${address}","ttl":{},"proxied":false}`

  // Pause the pings in case the CF API is lagging behind/fails and takes longer then 3 seconds, to prevent more CF API requests
  pausePings = true
  await cf.dnsRecords.edit(process.env.CLOUDFLARE_ZONE_ID, process.env.CLOUDFLARE_DNS_RECORD_ID, record)

  if (isDNSSetToFailback) {
    console.log('DNS changed to primary')
  } else {
    console.log('DNS changed to failback')
  }

  isDNSSetToFailback = !isDNSSetToFailback
  fails = 0
  pausePings = false
}

console.log('Started pinging ' + settings.primaryServerIP + ' every ' + settings.mcServerTimeout + 'ms')
