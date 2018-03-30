const url = require('url');
const logger = require('winston');
const when = require('when');
const nodefn = require('when/node');
const dns = require('dns');
const proxy = require('express-http-proxy');
const _ = require('lodash');

const request = require('request-promise');

class RouteToService {
    constructor(dnsLookup) {
        this.dns = dnsLookup;
    }
    getHostName(serviceName) {
      logger.error("Lookup host name for: " + serviceName);
      return nodefn
        .call(this.dns.resolveSrv, serviceName + '.service.consul')
        .then((srvs) => {
          logger.error("srvs="+JSON.stringify(srvs));
          return when
            .map(srvs, (srv) => {
              return nodefn
                .call(this.dns.resolve, srv.name)
               .then(function(a) { 
                  logger.error("a:" + a);
                  return a + ':' + srv.port;
                });
            });
        })
        .then(function(hosts) {
          return  hosts.join(',');
        });
    }

    /**
     * Convert the passed in request to a discovery neutral service request
     */
    send(req, resp, next) {
        logger.error("url="+req.url);
        let pathElements = req.url.split('/');
        logger.error("pathElements="+pathElements);
        let serviceName = pathElements.shift();
        if (serviceName.length === 0 && pathElements.length > 0) {
            serviceName = pathElements.shift();
        }

        let path = "/" + _.join(pathElements, '/');

        logger.error("serviceName: " + serviceName);
        logger.error("path: " + path);

        // TODO lookup service registry (404 if no entry)

        // dns resolve service host (TODO 404? if host not found)
        return this.getHostName(serviceName)
          .then((hosts) => {

            // TODO apply service policy check

            // TODO if service policy check failed, apply user policy check
            logger.error('hosts='+hosts);
            
            // Check if this is a request for swagger docs
            if (path === '/docs') return when(request({url:hosts+path}));
            
            // It's not, proceed as normal
            return proxy(hosts, {
                proxyReqPathResolver: function(req) {
                    return path;
                }
            })(req, resp, next); 
         })
         .otherwise(err => {
            let status = err.status || 500;
            if (status >= 500) {
              logger.error('%s', err.stack);
            } else {
              logger.warn('%s: %s', err.name, err.message);
            }

            if (err.status) {
              resp.setHeader('Content-Type', 'application/json');
              resp.status(status).end(JSON.stringify(err.toResponse()));
            } else {
              resp.status(status).end(err.message);
            }

            if(next) next(err);
        });
    };
}

logger.info("DISCOVERY_DNS:" + process.env.DISCOVERY_DNS);
if(process.env.DISCOVERY_DNS) {
  logger.info("USING DISCOVERY_DNS:" + process.env.DISCOVERY_DNS); 
  dns.setServers([process.env.DISCOVERY_DNS]);
}

module.exports =  new RouteToService(dns);
