
var semver = require('semver')
var path = require('path')
var program = require('commander')
program._name = 'zenbot'

var versions = process.versions

if (semver.gt('8.3.0', versions.node)) {
  console.log('You are running a node.js version older than 8.3.x, please upgrade via https://nodejs.org/en/')
  process.exit(1)
}

var fs = require('fs')
  , boot = require('./boot')

// boot.js
boot(function (err, zenbot) {
  if (err) {
    throw err
  }
  program.version(zenbot.version)

  var command_directory = './commands'

  fs.readdir(command_directory, function(err, files) {
    if (err) {
      throw err
    }

    // commdnas 하위 중 디렉토리 제외하고 파일만 모아 놓는다
    var commands = files.map((file)=>{
      return path.join(command_directory, file)
    }).filter((file)=>{
      return fs.statSync(file).isFile()
    })

    // commands/trad.js 가 있으면
    // zenbot trade 명령어를 등록 시킨다. 
    commands.forEach((file)=>{
      // 각 commands 들을 로드하고 즉시 실행 (인자로 program, zenbot.conf 를 넘김)
      require(path.resolve(__dirname, file.replace('.js','')))(program, zenbot.conf)
    })

    program
      .command('*', 'Display help', { noHelp: true })
      .action((cmd)=>{
        console.log('Invalid command: ' + cmd)
        program.help()
      })

    // 실제 명령어 실행  
    program.parse(process.argv)
  })
})
