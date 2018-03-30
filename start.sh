#!/bin/bash
echo $DISCOVERY_DNS
if [ -n "$DISCOVERY_DNS" ]
then
    export DISCOVERY_DNS=`getent hosts $DISCOVERY_DNS | awk '{ print $1 }'`
fi
echo $DISCOVERY_DNS
exec "$@"
