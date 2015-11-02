var queue = require('./queue.js')
var X = 0;

// run handler for messages from queue named 'example', the queue gets created if it doesn't already exist
var stopListening = queue.on('example', function(msg, callback) {
  console.log('ACK', msg)
  X += msg.x;
  // passing a non null argument to the handlers callback results in the message not being deleted
  // null signifies no error
  callback(null);
});

// stop consuming new messages after 5 seconds
setTimeout(function() {
  console.log('stopping listening')
  if (X !== 3) throw new Error('messages not received');
  stopListening();
}, 5000);

// alternatively get a single message
queue.get('example1', function(msg, callback) {
  console.log('ACK', msg)
  X += msg.x;
  callback(null);
});

// put a single message
queue.put('example', {text : 'this is an example message', x : 1}, function(err) {
  if (err) throw new Error(err);
  console.log('example message queued');
});

// put a message into the other queue
queue.put('example1', {text : 'this however is an example1 message', x: 2}, function(err) {
  if (err) throw new Error(err);
  console.log('example1 message queued');
});

// this is a bit slow to include in the test.
//queue.clear('example', function(err) {
//  gets called after 60 seconds, according to sqs documentation clearing should then be compelted
//});
