---
title: Dubbo 集成 Spring Security 和 OAuth2
tags:
  - Dubbo、
categories:
  - Back
date: 2024-12-26T21:04:46+08:00
draft: true
---
### 定义与基本概念

`Spring Security` 是一个基于 Spring 框架的安全框架，为 Java 企业级应用提供了全面的安全解决方案，涵盖了身份验证（用户登录）、授权（访问控制）、加密和防止常见的安全漏洞等功能。它可以集成到各种类型的 Spring 应用中，包括 Web 应用（如 Spring MVC、Spring Boot）和非 Web 应用。

`OAuth2`（开放授权 2.0）是一个开放标准的授权框架，旨在解决不同应用之间的授权问题，允许用户在不向第三方应用透露自己的用户名和密码的情况下，授权第三方应用访问他们存储在另一个服务提供商上的资源。它通过使用令牌`Token`来代表用户的授权，使得资源服务器能够验证请求是否被授权。

#### 核心角色与流程

 - **资源所有者**：通常是用户，拥有受保护的资源。

- **资源服务器**：存储资源的服务器，需要对请求进行授权验证。

- **客户端**：请求访问资源的应用程序。

- **授权服务器**：负责验证资源所有者的身份，并发放令牌给客户端

客户端请求资源所有者授权，资源所有者同意后，授权服务器向客户端发放令牌，客户端携带令牌访问资源服务器，资源服务器验证令牌的有效性后提供资源。

#### 与 `Dubbo` 的协同

同时低版本 `javax` 和高版本 `jakarta servlet API` ，`jakarta API` 优先级更高，只需要引入jar即可使用`HttpServletRequest`和`HttpServletResponse`作为参数

**使用 Filter 扩展**: 实现 `Filter` 接口和 `org.apache.dubbo.rpc.protocol.tri.rest.filter.RestExtension` 接口，然后注册SPI

### 主要流程

由于 `OAuth2` 需要授权服务器，资源服务器，客户端，为了简化案例，就写授权服务器和资源服务器。

#### AuthorizationServer

采用默认配置

```java
@Bean  
public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {  
    OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);  
  
    return http.build();  
}
```

##### 1. 端点访问控制

- **授权端点（/authorize）**：
    - 要求进行身份验证，只有已认证的用户才能发起授权请求。默认情况下，通常会使用 Spring Security 的标准身份验证机制，如基于表单的登录或 HTTP Basic 认证。
    - 限制对该端点的请求方法，一般只允许 `GET` 和 `POST` 方法，以防止恶意的请求操作。
- **令牌端点（/token）**：
    - 此端点用于发放访问令牌和刷新令牌，安全要求更高。默认配置会要求客户端进行身份验证，通常通过客户端 ID 和客户端密钥进行认证。
    - 同样限制请求方法，一般只允许 `POST` 方法，以确保只有合法的请求才能获取令牌。

##### 2. 防止跨站请求伪造（CSRF）

- 启用 CSRF 保护机制，CSRF 是一种常见的网络攻击手段，攻击者通过在用户已登录的情况下，利用用户的浏览器自动发送恶意请求。默认配置会在授权服务器的相关请求中添加 CSRF 防护措施，例如在表单提交时要求包含 CSRF 令牌。
- 对于一些与 OAuth2 流程紧密相关的请求，可能会根据具体情况对 CSRF 保护进行特殊配置，例如在某些情况下允许特定的请求绕过 CSRF 检查，但这需要谨慎处理以确保安全性。

##### 3. 安全头信息设置

- 添加各种安全相关的 HTTP 头信息，以增强安全性。例如：
    - `Content-Security-Policy`：用于限制网页可以加载的资源来源，防止跨站脚本攻击（XSS）。
    - `X-Frame-Options`：防止页面被嵌入到其他页面的框架中，避免点击劫持攻击。
    - `X-XSS-Protection`：启用浏览器的 XSS 过滤机制，帮助检测和阻止 XSS 攻击。

```java

private static final String HOST = System.getProperty("authorization.address", "localhost");  
  
String issuer = "http://" + HOST + ":9000";

@Bean  
public RegisteredClientRepository registeredClientRepository() {  
    RegisteredClient registeredClient = RegisteredClient.withId(UUID.randomUUID().toString())  
            .clientId("49fd8518-12eb-422b-9264-2bae0ab89f66") //configure the client id  
            .clientSecret("{noop}H3DTtm2fR3GRAdr4ls1mcg") // configure the client secret  
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)  
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)  
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)  
            .redirectUri("http://localhost:9000/oauth2/token") // configure the redirect uri  
            .scope("openid")  
            .scope("read")  
            .scope("write")  
            .build();  
  
    return new InMemoryRegisteredClientRepository(registeredClient);  
}

@Bean  
public AuthorizationServerSettings authorizationServerSettings() {  
    return AuthorizationServerSettings.builder()  
            .issuer(issuer) // set the address of the authorization server  
            .build();  
}
```

配置相关授权信息，并进行相关接口的暴露

#### ResourceServer

核心在 `OAuthFilter` 中，实现了 'Filter, RestExtension' ，并通过 `@Activate` 来进行激活，在 `Dubbo` 里进行拦截，下面是对接口的实现

```java
@Override  
public void init(FilterConfig filterConfig) {  
    // Initialize the JwtDecoder and obtain the public key from the configured authorization server URL for decoding the JWT  
    jwtDecoder = NimbusJwtDecoder.withIssuerLocation(issuer).build();  
    // Initialize JwtAuthenticationConverter to convert JWT  
    jwtAuthenticationConverter = new JwtAuthenticationConverter();  
    JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();  
    jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);  
}  
  
@Override  
public String[] getPatterns() {  
    return new String[] {"/**"}; // Intercept all requests  
}  
  
@Override  
public void doFilter(  
        ServletRequest servletRequest,  
        ServletResponse servletResponse,  
        FilterChain filterChain) throws IOException {  
    HttpServletRequest request = (HttpServletRequest) servletRequest;  
    HttpServletResponse response = (HttpServletResponse) servletResponse;  
    String authorization = request.getHeader("Authorization");  
    if (authorization != null && authorization.startsWith("Bearer ")) {  
        String jwtToken = authorization.substring("Bearer ".length());  
        // Decode the JWT token  
        try {  
            Jwt jwt = jwtDecoder.decode(jwtToken);  
            jwtAuthenticationConverter.convert(jwt);  
            filterChain.doFilter(request, response);  
        } catch (Exception e) {  
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid JWT token");  
        }  
  
    } else {  
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing JWT token");  
    }  
  
}  
  
@Override  
public int getPriority() {  
    return -200;  
}
```

在 `doFilter` 中对令牌进行权限校验，如果令牌正确，则放行，反之就拒绝访问。

这里涉及到 有关



