def handler(context):
  
  # We need the requests module to make HTTP requests to the Main function
  import requests
  # We need the json module to convert our JSON object to a JSON string
  import json

  # Make sure we create JSON object form our StringIO input
  print context.body.getvalue()
  obj = json.loads(context.body.getvalue())

  # Here we have some defaulting logic that will add the attributes if they do not exist
  if obj.get("Name", None) is None:
    obj["Name"] = "Nameless"
  if obj.get("Color", None) is None:
    obj["Color"] = "Transparent"

  # Make sure we perform our HTTP request to the Main function with a JSON content type header
  headers = {'content-type': 'application/json'}

  # Perform the actual call to our Main function
  # NOTE: Please change the IP address to the EXTERNAL-IP address from the main-storeshape-deployment (run this command: kubectl get services)
  r = requests.post(url = "http://52.165.129.49:8080", data=json.dumps(obj), headers=headers)
  
  print 'data =' + r.text

  return r.text