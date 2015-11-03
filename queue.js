var AWS = require('aws-sdk');
if (process.env.AWS_REGION) AWS.config.update({region: process.env.AWS_REGION});
else AWS.config.update({region: 'us-east-1'});
var QUEUES = {};

/* `get` takes a queue named `name` and a message handling function `handler`,
 * `handler` is an async function expecting (msg, callback), where callback takes an error as first argument.
 * if the handler runs `callback` with error = null, then we delete the message from the queue. otherwise, we don't.
 * messages received and not deleted too many times will end up in a 'dead letter' queue.
 * errors getting the queue or receiving messages are ignored and retries are attempted.
 * */
function get(name, handler, options) {
  if (options === undefined) options = {}
  if (options.MaxNumberOfMessages === undefined) options.MaxNumberOfMessages = 1;
  if (options.WaitTimeSeconds === undefined) options.WaitTimeSeconds = 5;
  if (options.VisibilityTimeout === undefined) options.VisibilityTimeout  = 300;
  var cancel = false;
  function _get() {
    if (cancel) return;
    _getQueue(name, function(err, q) {
      if (err) {
        console.error('get queue error', err);
        if (cancel) return;
        return process.nextTick(_get);
      }
      q.receiveMessage(options, function(err, data) {
        if (err) {
          console.error('receive message error', err);
          if (cancel) return;
          return process.nextTick(_get);
        }
        if (Array.isArray(data.Messages) && data.Messages.length) {
          var body = JSON.parse(data.Messages[0].Body);
          var receiptHandle = data.Messages[0].ReceiptHandle;
          handler(body, function(err) {
            if (err) {
              console.error('handler error, ignoring', err)
              return;
            }
            q.deleteMessage({QueueUrl: q['_#_QURL'], ReceiptHandle: receiptHandle}, function() {});
          });
        } else {
          if (cancel) {
            return;
          }
          process.nextTick(_get);
        }
      });
    });
  }
  _get()
  return function() { cancel = true ; }
}

/* `on` runs `handler` for every message in `name` queue.
 * `handler` is an async function expecting (msg, callback), where callback takes an error as first argument.
 *  */
function on(name, handler, options) {
  var cancel = false;
  var getCancel = function() {};
  function _on() {
    if (cancel) return;
    getCancel = get(name, function(body, callback) {
      handler(body, function(err) {
        callback(err);
        if (cancel) return;
        process.nextTick(_on);
      });
    }, options);
  }
  _on();
  return function() { cancel = true; getCancel(); }
}

/* purge the queue, callback runs 60 seconds later, when messages are guarenteed to have been cleared (according to aws docs).
 */
function clear(name, callback) {
  _getQueue(name, function(err, q) {
    q.purgeQueue({QueueUrl: q['_#_QURL']}, function(err) {
      if (err) return callback(err);
      setTimeout(callback.bind(this, null), 60000);
    });
  })
}

/* `put` places `msg` in queue `name`, then runs `callback`. */
function put(name, msg, callback) {
  var val = JSON.stringify(msg);
  _getQueue(name, function(err, q) {
    if (err) return callback(err);
    q.sendMessage({MessageBody: val}, callback);
  });
}

function _getQueue(queueName, callback) {
  if (QUEUES[queueName] !== undefined) return callback(null, QUEUES[queueName]);
  var sqs = new AWS.SQS();
  sqs.createQueue({QueueName: queueName}, function(err, data) {
    if (err) return callback(err);
    QUEUES[queueName] = new AWS.SQS({params: {QueueUrl: data.QueueUrl}});
    QUEUES[queueName]['_#_QURL'] = data.QueueUrl;
    callback(null, QUEUES[queueName]);
  });
}

module.exports = {get : get, put : put, on : on, clear : clear};
