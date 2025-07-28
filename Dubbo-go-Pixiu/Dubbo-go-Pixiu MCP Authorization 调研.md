---
title: Dubbo-go-Pixiu MCP Authorization 调研
tags:
  - Dubbo
  - learn
categories:
  - Dubbo
  - Go
date: 2025-07-26T21:56:41+08:00
draft: true
---
##   Authorization Flow  授权流程

### 背景

由于 MCP 服务不仅局限于本地，而是在互联网上进行更大范围的使用，所以鉴权是很有意义且有必要的一件事，这关乎到 MCP Server 的安全性。目前在 Pixiu 网关中已经实现了将后端 API 包装成 MCP Server ，现在需要做的是利用网关本身的能力集成鉴权功能，实现 MCP 协议中的 Authorization 部分。

Implementations using an HTTP-based transport **SHOULD** conform to this specification.
基于 HTTP 的传输应该实现此规范。

#### Pixiu 角色的抉择

> A protected _MCP server_ acts as an [OAuth 2.1 resource server](https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-13.html#name-roles), capable of accepting and responding to protected resource requests using access tokens.
> 
> The _authorization server_ is responsible for interacting with the user (if necessary) and issuing access tokens for use at the MCP server. The implementation details of the authorization server are beyond the scope of this specification. It may be hosted with the resource server or a separate entity. The [Authorization Server Discovery section](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization#authorization-server-discovery) specifies how an MCP server indicates the location of its corresponding authorization server to a client.

受保护的 MCP 服务器充当 OAuth 2.1 资源服务器，能够使用访问令牌接受和响应受保护的资源请求。

授权服务器负责与用户交互（如有必要）并颁发供 MCP 服务器使用的访问令牌。授权服务器的实现细节超出了本规范的范围。它可以与资源服务器一起托管，也可以作为单独的实体托管。指定 MCP 服务器如何向客户端指示其相应授权服务器的位置。

对于Pixiu 网关而言，我觉得包装成 Resource Server 是更好且正确的选择。

| 方案                           | 优点                                                                                       | 缺点                                                                       |
|:------------------------------ |:------------------------------------------------------------------------------------------ |:-------------------------------------------------------------------------- |
| 网关只作资源服务器 (推荐)      | 架构清晰，职责单一。<br>安全性高，依赖专业方案。<br>灵活，可扩展性强。<br>符合行业最佳实践 | 需要额外部署/购买一个授权服务器                                            |
| 网关 = 资源服务器 + 授权服务器 | 表面上看起来组件少，部署简单                                                               | 架构混乱，高耦合。<br>极高的安全风险。<br>难以维护和扩展。<br>缺乏互操作性 |

#### 功能要求

MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata ([RFC9728](https://datatracker.ietf.org/doc/html/rfc9728)). MCP clients **MUST** use OAuth 2.0 Protected Resource Metadata for authorization server discovery.

Pixiu 作为 MCP Server 需要保护资源元数据。

Implementors should note that Protected Resource Metadata documents can define multiple authorization servers. The responsibility for selecting which authorization server to use lies with the MCP client, following the guidelines specified in [RFC9728 Section 7.6 “Authorization Servers”](https://datatracker.ietf.org/doc/html/rfc9728#name-authorization-servers).  
Pixiu 应该支持多个授权服务器的选择，选择权在于 MCP Client。

MCP servers **MUST** use the HTTP header `WWW-Authenticate` when returning a _401 Unauthorized_ to indicate the location of the resource server metadata URL as described in [RFC9728 Section 5.1 “WWW-Authenticate Response”](https://datatracker.ietf.org/doc/html/rfc9728#name-www-authenticate-response).

Pixiu 在返回 401 的时候，需要通过 `WWW-Authenticate` 指示资源服务器的元数据 URL

#### 流程图

```mermaid
sequenceDiagram
    participant C as Client
    participant M as MCP Server (Resource Server)
    participant A as Authorization Server

    C->>M: MCP request without token
    M-->>C: HTTP 401 Unauthorized with WWW-Authenticate header
    Note over C: Extract resource_metadata<br />from WWW-Authenticate

    C->>M: GET /.well-known/oauth-protected-resource
    M-->>C: Resource metadata with authorization server URL
    Note over C: Validate RS metadata,<br />build AS metadata URL

    C->>A: GET /.well-known/oauth-authorization-server
    A-->>C: Authorization server metadata

    Note over C,A: OAuth 2.1 authorization flow happens here

    C->>A: Token request
    A-->>C: Access token

    C->>M: MCP request with access token
    M-->>C: MCP response
    Note over C,M: MCP communication continues with valid token
```

