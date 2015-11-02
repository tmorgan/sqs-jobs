## An SQS Job management library

This library provides a simple way to poll SQS for messages and run handlers against them. Queues get implicitly created for convinence. Messages are serialised to/from JSON. Optionally pass the underlaying sqs options controlling visibility and wait time. The handlers follow the standard node convention when calling their callback, and if the first argument is non-null then an error is considered to have occurred in the message's handling, and it is subsequently not deleted from the job queue.

### Example:

    var queue = require('aws-jobs')

    // run handler for messages from queue named 'example', the queue gets created if it doesn't already exist
    var stopListening = queue.on('example', function(msg, callback) {
      console.log(msg);
      // passing a non null argument to the handlers callback results in the message not being deleted
      // null signifies no error
      callback(null); 
    });

    // stop consuming new messages after 10 seconds
    setTimeout(stopListening, 10000); 

    // alternatively get a single message
    queue.get('example', function(msg, callback) {
      console.log(msg);
      callback(null);
    });
    
    // put a single message
    queue.put('example', { text : 'this is an example message'}, function(err) {
      // gets run after callback
    });

    queue.clear('example', function(err) {
      // gets called after 60 seconds, according to sqs documentation clearing should then be compelted
    });

the `on` and `get` take an optional third argument containing the underlaying sqs options, defaulting to:

    {MaxNumberOfMessages : 1, WaitTimeSeconds : 5, VisibilityTimeout  : 300}


### Misc: 

Region is set to 'us-east-1' or the environment AWS_REGION if set, and aws keys are expected in environment variables as per aws-sdk docs.

git precommit-hook runs jslint and jscs with to enforce style.
