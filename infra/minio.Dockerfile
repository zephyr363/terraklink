# The upstream Community Edition is source-only; do not rely on removed registry tags.
FROM golang:1.25-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /src
ARG MINIO_COMMIT=7aac2a2c5b7c882e68c1ce017d8256be2feea27f
RUN git init && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth 1 origin ${MINIO_COMMIT} && git checkout FETCH_HEAD
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -o /minio .
FROM alpine:3.22
RUN apk add --no-cache ca-certificates && addgroup -S minio && adduser -S minio -G minio \
    && mkdir -p /data && chown minio:minio /data
COPY --from=build /minio /usr/local/bin/minio
COPY --from=build /src/LICENSE /src/NOTICE /usr/share/minio/
USER minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
