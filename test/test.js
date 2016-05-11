var Kit = require('..');

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);
var nock = require('nock');

var path = require('path');

var fs = require('fs');

var Voog = require('voog');

var HOMEDIR = process.env.HOME;
var LOCALDIR = process.cwd();
var CONFIG_FILENAME = '.voog';
var LOCAL_CONFIG_PATH = path.join(LOCALDIR, CONFIG_FILENAME);
var GLOBAL_CONFIG_PATH = path.join(HOMEDIR, CONFIG_FILENAME);
var TEST_CONFIG_PATH = path.join(LOCALDIR, 'test', CONFIG_FILENAME);
var INVALID_PATH = 'INVALID';

var TEST_CONFIG_CONTENTS = '{\n  "sites": [{\n    "host": "testhost.voog.com",\n    "token": "SECRET",\n    "name": "test"\n  }]\n}';

describe('Kit', function() {
  context('.actions', function() {
    var options = {config_path: TEST_CONFIG_PATH};

    context('#clientFor', function() {
      context('when given a host and token', function() {
        it('should return a Voog object', function() {
          var name = 'test';
          var client = Kit.actions.clientFor(name, options);
          expect(client).to.be.a('object');
          expect(typeof client.host).to.not.be.undefined;
          expect(typeof client.api_token).to.not.be.undefined;
        });
      });
    });

    context('#pullAllFiles', function() {

    });
    context('#pushAllFiles', function() {

    });
    context('#findFile', function() {
      context('with a valid file', function() {
        it('resolves to a file object', function() {
          var error, value;
          nock.disableNetConnect();
          var mockAPI = nock('http://testhost.voog.com')
            .get('/admin/api/layouts')
            .query({'q.layout.component': true, per_page: 250})
            .reply(200, [{title: 'test'}]);

          try {
            value = Kit.actions.findFile('components/test.tpl', 'test', options);
          } catch (e) {
            error = e;
          }
          expect(error).to.be.undefined;
          return expect(value).to.become({title: 'test'});
        });
      });

      context('with an invalid file', function() {
        it('rejects with undefined', function() {
          var error, value;
          nock.disableNetConnect();
          var mockAPI = nock('http://testhost.voog.com')
            .get('/admin/api/layouts')
            .query({'q.layout.component': false, per_page: 250})
            .reply(200, [{title: 'test'}]);

          try {
            value = Kit.actions.findFile('layouts/foobar.tpl', 'test', options);
          } catch (e) {
            error = e;
          }

          expect(error).to.be.undefined;
          return expect(value).to.be.rejectedWith(undefined);
        });
      });
    });

    context('#pushFile', function() {
      context('with a valid file', function() {
        it ('uploads a file and returns a Promise for the file object');
      });
    });
    context('#pullFile', function() {

    });
  });

  context('.config', function() {
    context('#siteByName', function() {
      var options = {config_path: TEST_CONFIG_PATH};

      it('returns a site object that matches the given name', function() {
        var error;
        var value;

        var readStub = sinon
          .stub(fs, 'readFileSync')
          .returns(TEST_CONFIG_CONTENTS);

        try {
          value = Kit.config.siteByName('test', options);
        } catch (e) {
          error = e;
        }

        expect(value).to.be.an('object');
        expect(Object.keys(value).length).to.be.eq(3);

        readStub.restore();
      });

      it('returns nothing if the name does not match', function() {
        var error;
        var value;

        var readStub = sinon
          .stub(fs, 'readFileSync')
          .returns(TEST_CONFIG_CONTENTS);

        try {
          value = Kit.config.siteByName('foobar', options);
        } catch (e) {
          error = e;
        }

        expect(value).to.be.undefined;

        readStub.restore();
      });
    });

    context('#sites', function() {
      var options = {config_path: TEST_CONFIG_PATH};

      it('returns a list of defined sites, as objects', function() {
        var error;
        var value;

        var readStub = sinon
          .stub(fs, 'readFileSync')
          .returns(TEST_CONFIG_CONTENTS);

        try {
          value = Kit.config.sites(options);
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
        expect(value).to.be.an('array');
        expect(value.length).to.be.eq(1);

        var site = value[0];
        expect(site.host).to.be.a('string');
        expect(site.host).to.be.eq('testhost.voog.com');
        expect(site.token).to.be.a('string');
        expect(site.token).to.be.eq('SECRET');
        expect(site.name).to.be.a('string');
        expect(site.name).to.be.eq('test')

        readStub.restore();
      })
    });

    context('#write', function() {
      var options = {config_path: TEST_CONFIG_PATH};

      it('writes the given key and value to the config', function() {
        var error;
        var value;
        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return true;
            }
          });

        var readStub = sinon
          .stub(fs, 'readFileSync')
          .returns(TEST_CONFIG_CONTENTS);

        var writeStub = sinon
          .stub(fs, 'writeFileSync');

        try {
          value = Kit.config.write('testkey', 'testvalue', options);
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
        expect(writeStub.args[0][0]).to.be.eq(TEST_CONFIG_PATH);

        var match = writeStub.args[0][1].match(/"testkey": "testvalue"/);
        expect(match).to.be.an('array');
        expect(match.length).to.be.eq(1);

        statStub.restore();
        writeStub.restore();
        readStub.restore();
      });
    });

    context('#read', function() {
      var options = {config_path: TEST_CONFIG_PATH};

      it('returns the value corresponding to the given key', function() {
        var error;
        var value;
        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return true;
            }
          });

        var readStub = sinon
          .stub(fs, 'readFileSync')
          .returns(TEST_CONFIG_CONTENTS);

        try {
          value = Kit.config.read('sites', options);
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
        expect(value).to.be.an('array');
        expect(value.length).to.equal(1);
        expect(value[0]).to.be.an('object');

        statStub.restore();
        readStub.restore();
      });

      it('returns nothing if the given key is not in the config', function() {
        var readStub = sinon
          .stub(fs, 'readFileSync')
          .returns(TEST_CONFIG_CONTENTS);

        try {
          value = Kit.config.read('foobar', options);
        } catch (e) {
          error = e;
        }

        expect(value).to.be.undefined;

        readStub.restore();
      });
    });

    context('#configPathFromOptions', function() {
      it('should raise an Exception when there is nothing to fallback to', function() {
        var error;
        var filePath;

        // stub statSync to always return false
        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return false;
            }
          });

        try {
          filePath = Kit.config.configPathFromOptions();
        } catch (e) {
          error = e;
        }
        expect(error).to.not.be.undefined;
        expect(error.message).to.equal('Unable to find configuration file!');
        expect(statStub.calledWith(GLOBAL_CONFIG_PATH)).to.be.true;
        expect(filePath).to.be.undefined;

        statStub.restore();
      });

      it('should fallback to the default global path', function() {
        var error;
        var filePath;

        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return true;
            }
          });

        try {
          filePath = Kit.config.configPathFromOptions();
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
        expect(statStub.calledWith(GLOBAL_CONFIG_PATH)).to.be.true;
        expect(filePath).to.be.equal(GLOBAL_CONFIG_PATH);

        statStub.restore();
      });

      it('should use the local path if explicitly required to do so', function() {
        var error;
        var filePath;
        var options = {local: true};

        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return true;
            }
          });

        try {
          filePath = Kit.config.configPathFromOptions(options);
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
        expect(statStub.calledWith(path.join(LOCALDIR, CONFIG_FILENAME))).to.be.true;
        expect(statStub.calledOnce).to.be.true;
        expect(filePath).to.be.equal(path.join(LOCALDIR, CONFIG_FILENAME));

        statStub.restore();
      });
      it('should raise an Exception if the given custom path is invalid', function() {
        var error;
        var filePath;
        var options = {config_path: INVALID_PATH};

        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return false;
            }
          })

        try {
          filePath = Kit.config.configPathFromOptions(options);
        } catch (e) {
          error = e;
        }

        expect(error).to.not.be.undefined;
        expect(error.message).to.equal('Unable to find configuration file!');
        expect(statStub.calledWith(INVALID_PATH)).to.be.true;
        expect(filePath).to.be.undefined;

        statStub.restore();
      });

      it('should return the explicitly given custom path if it is valid', function() {
        var error;
        var filePath;
        var options = {config_path: TEST_CONFIG_PATH};

        var statStub = sinon
          .stub(fs, 'statSync')
          .returns({
            isFile: function() {
              return true;
            }
          })

        try {
          filePath = Kit.config.configPathFromOptions(options);
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
        expect(statStub.calledWith(TEST_CONFIG_PATH)).to.be.true;
        expect(filePath).to.equal(TEST_CONFIG_PATH);

        statStub.restore();
      });
    });
  });

  context('.sites', function() {
    var options = {config_path: TEST_CONFIG_PATH};
    context('#add', function() {
      context('with valid data', function() {
        it('writes a site object to the configuration file', function() {
          var error;
          var value;

          var writeStub = sinon.stub(Kit.config, 'write');

          var data = {host: 'new.voog.com', token: 'newsecret'};

          try {
            value = Kit.sites.add(data, options)
          } catch (e) {
            error = e;
          }

          expect(value).to.be.true;
          expect(writeStub.called).to.be.true;

          writeStub.restore();
        });
      });

      context('with invalid data', function() {
        it('does not modify the configuration file', function() {
          var error;
          var value;

          var writeStub = sinon.stub(Kit.config, 'write');

          var data = {token: 'newsecret'};

          try {
            value = Kit.sites.add(data, options)
          } catch (e) {
            error = e;
          }

          expect(value).to.be.false;
          expect(writeStub.called).to.be.false;

          writeStub.restore();
        });
      });
    });

    context('#remove', function() {
      context('with valid data', function() {
        it('removes the site with the given name from the configuration file', function() {
          var error;
          var value;

          var writeStub = sinon.stub(fs, 'writeFileSync');

          var name = 'test';

          try {
            value = Kit.sites.remove(name, options)
          } catch (e) {
            error = e;
          }

          expect(error).to.be.undefined;
          expect(value).to.be.true;
          expect(writeStub.called).to.be.true;
          var match = writeStub.args[0][1].match(/"sites": \[\]/);
          expect(match).to.be.an('array');
          expect(match.length).to.be.eq(1);

          writeStub.restore();
        });
      });

      context('with invalid data', function() {
        it('does not modify the configuration file', function() {

        });
      });
    });

    context('#getFileInfo', function() {
      context('with a valid file path', function() {
        it('returns an object with the basic file metainformation', function() {
          var value;
          var error;

          var statStub = sinon.stub(fs, 'statSync').returns({
            size: 100,
            mtime: (new Date())
          });

          try {
            value = Kit.sites.getFileInfo('foo/bar/test.txt');
          } catch (e) {
            error = e;
          }

          expect(error).to.be.undefined;
          expect(value).to.be.an('object');
          expect(value.file).to.be.eq('test.txt');
          expect(value.size).to.be.eq(100);
          expect(value.contentType).to.be.eq('text/plain');
          expect(value.path).to.be.eq('foo/bar/test.txt');
          expect(value.updatedAt).to.be.a('Date');

          statStub.restore();
        });
      });

      context('with an invalid file path', function() {
        it('does not return anything', function() {
          var value;
          var error;

          value = Kit.sites.getFileInfo('foo/bar/test.txt');

          expect(value).to.be.undefined;
        })
      })
    });

    context('#totalFilesFor', function() {

    });

    context('#filesFor', function() {

    });

    context('#dirFor', function() {
      context('when the path is not defined', function() {
        it('returns nothing', function() {
          var value = Kit.sites.dirFor('test', options);

          expect(value).to.be.undefined;
        });
      });

      context('when the path is defined', function() {
        it('returns the path value for the given site', function() {
          var stub = sinon.stub(Kit.config, 'siteByName').returns({
            dir: 'test/path'
          });

          var value = Kit.sites.dirFor('test', options);

          expect(value).to.be.eq('test/path');

          stub.restore();
        });
      })
    });

    context('#hostFor', function() {
      it('returns the host value for the given site', function() {
        var value = Kit.sites.hostFor('test', options);

        expect(value).to.be.eq('testhost.voog.com:80');
      });
    });

    context('#tokenFor', function() {
      it('returns the token value for the given site', function() {
        var value = Kit.sites.tokenFor('test', options);

        expect(value).to.be.eq('SECRET');
      });
    });

    context('#names', function() {
      it('returns a list of available site names from the configuration file', function() {
        var value = Kit.sites.names(options);

        expect(value).to.be.an('array');
        expect(value.length).to.be.eq(1);
        expect(value[0]).to.be.eq('test');
      });
    });
  });
});
