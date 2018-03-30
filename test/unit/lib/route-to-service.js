const routeToService = require('../../../src/lib/route-to-service.js');
const assert = require('assert');
const when = require('when'); 
const nock = require('nock');
const sinon = require('sinon');

describe('lib/route-to-service', () => { 
  describe('#send', () => {
    context('discovery method: consul', () => {
      let env; 
      let productService = null;
      let productServiceStaging = null;
      let sandbox = null;

      beforeEach(() => {
        sandbox = sinon.sandbox.create();
        env = process.env;
     
        sandbox.stub(routeToService.dns, 'resolveSrv')
            .callsArgWith(1,null,[{"name":"ac120005.addr.dc1.consul","port":5000,"priority":1,"weight":1}]);
        sandbox.stub(routeToService.dns, 'resolve')
            .callsArgWith(1,null,'172.18.0.5');
        productService = nock('http://172.18.0.5:5000')
        .get('/products') 
        .reply(200, [{
            'name':'product1'
        }]);

      });
      afterEach(() => { 
        process.env = env;
        sandbox.restore();
      });
 
      it('should proxy to products-service via consul', () => {
        console.log('starting test'); 
        return when(routeToService.send({'protocol':'http','url':'/products-service/products', 'body':'', 'method':'Get', 'parseReqBody':false}))
        .then(products => {
            assert(products);
            assert.equal(products,"[{\"name\":\"product1\"}]"); 
        });
      });

    });
  });
}); 

