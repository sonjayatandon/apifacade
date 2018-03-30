FROM consul
RUN sed -i "s/gosu consul //g" /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
