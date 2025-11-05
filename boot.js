var _ = require('lodash')
var path = require('path')
var minimist = require('minimist')
var version = require('./package.json').version
var EventEmitter = require('events')

module.exports = function (cb) {

  var zenbot = { version } // zenbot 객체 생성
  var args = minimist(process.argv.slice(3))
  var conf = {} 
  var config = {}
  var overrides = {}

  module.exports.debug = args.debug

  // args.conf가 존재하면 overrides 객체에 밀어놔준다  
  // 1. load conf overrides file if present
  if(!_.isUndefined(args.conf)){
    try {
      overrides = require(path.resolve(process.cwd(), args.conf))
    } catch (err) {
      console.error(err + ', failed to load conf overrides file!')
    }
  }

  // conf가 conf에 할당한다  
  // 2. load conf.js if present
  try {
    conf = require('./conf')
  } catch (err) {
    console.error(err + ', falling back to conf-sample')
  }

  // 3. Load conf-sample.js and merge
  var defaults = require('./conf-sample')
  _.defaultsDeep(config, overrides, conf, defaults) // config 객체에 overrides + conf + default 를 병합해서 설정을 만들어냄. 
  zenbot.conf = config // 최종적으로 만들어낸 zenbot 에 주입한다  

  // --------------------------------------------------------------------
  // 애플리케이션 전체의 이벤트 통신  
  var eventBus = new EventEmitter()
  zenbot.conf.eventBus = eventBus

  var authStr = '', authMechanism, connectionString

  if(zenbot.conf.mongo.username){
    authStr = encodeURIComponent(zenbot.conf.mongo.username)

    if(zenbot.conf.mongo.password) authStr += ':' + encodeURIComponent(zenbot.conf.mongo.password)

    authStr += '@'

    // authMechanism could be a conf.js parameter to support more mongodb authentication methods
    authMechanism = zenbot.conf.mongo.authMechanism || 'DEFAULT'
  }

  if (zenbot.conf.mongo.connectionString) {
    connectionString = zenbot.conf.mongo.connectionString
  } else {
    connectionString = 'mongodb://' + authStr + zenbot.conf.mongo.host + ':' + zenbot.conf.mongo.port + '/' + zenbot.conf.mongo.db + '?' +
      (zenbot.conf.mongo.replicaSet ? '&replicaSet=' + zenbot.conf.mongo.replicaSet : '' ) +
      (authMechanism ? '&authMechanism=' + authMechanism : '' )
  }

  // --------------------------------------------------------------------
  // mongoDB 연결  
  require('mongodb').MongoClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true}, function (err, client) {
    if (err) {
      console.error('WARNING: MongoDB Connection Error: ', err)
      console.error('WARNING: without MongoDB some features (such as backfilling/simulation) may be disabled.')
      console.error('Attempted authentication string: ' + connectionString)
      cb(null, zenbot)
      return
    }
    var db = client.db(zenbot.conf.mongo.db)
    _.set(zenbot, 'conf.db.mongo', db)

    // 최종적으로 zenbot 객체를 넘겨서 콜백을 수행한다  
    cb(null, zenbot)
  })
}
