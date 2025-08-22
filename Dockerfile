FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /app

# Copy everything
COPY . ./
# sets the version
RUN chmod +x ./setversion.sh && ./setversion.sh
# Restore as distinct layers
RUN dotnet restore
# Build and publish a release
RUN dotnet publish --runtime linux-x64 --self-contained false -c Release -o out

# Build runtime image
#FROM mcr.microsoft.com/dotnet/aspnet:7.0-alpine AS runtime
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
#ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
#RUN sed "s/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g" /etc/apk/repositories
#RUN apk add --no-cache icu-libs icu-data-full libintl libssl3 zlib tzdata bash

WORKDIR /app
COPY --from=build-env /app/out .
#COPY ./build ./
COPY /Apps /app/Apps
ENV Docker=1
COPY /reset.sh /app/reset.sh
RUN chmod +x /app/reset.sh
COPY /docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# make sh open bash
RUN ln -sf /bin/bash /bin/sh

#RUN dotnet dev-certs https

ENTRYPOINT ["/app/docker-entrypoint.sh"]