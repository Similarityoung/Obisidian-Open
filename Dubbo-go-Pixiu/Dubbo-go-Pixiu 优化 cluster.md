
```txt
客户端
  -> 入口层
     accept / read / TLS / request body read
  -> 路由层
     path / method / header match
  -> 过滤器层
     auth / ratelimit / rewrite / transform / policy
  -> 上游层
     cluster pick -> conn pool -> dial/TLS -> RTT -> backend -> retry
  -> 回包层
     decode / transform / write / flush
  -> 客户端
```

