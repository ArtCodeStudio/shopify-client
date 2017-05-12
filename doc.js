const client = require('scp2');
const json = require('comment-json');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['publish', 'mardown'],
});
const server = json.parse(fs.readFileSync('doc-server.json').toString());
const pkg = json.parse(fs.readFileSync('package.json').toString());
server.path += '/'+pkg.name;

/**
 * Publish the docs path on the webserver
 */
const publishDocFolder = () => {
  client.scp('docs/', server, function(err) {
    if(err) {
      return console.error(err);
    }
    console.log(`doc published on ${server.url}/${pkg.name}`);
  });
};

if(argv.publish) {
  publishDocFolder();
}
