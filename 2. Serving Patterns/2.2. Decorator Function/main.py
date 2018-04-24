def handler(context):

  # TODO: Implement persistence. 
  # Do something usefull with the data, but for demo purposes we will just return the JSON object we received during the request
  print context.body.getvalue()
  return context.body.getvalue()
  