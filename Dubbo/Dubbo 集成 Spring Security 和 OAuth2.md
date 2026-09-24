---
title: Dubbo 集成 Spring Security 和 OAuth2
type: notes
slug: dubbo-spring-security-oauth2
summary: "记录 Dubbo REST 请求接入 Spring Security 和 OAuth2 令牌校验的示例。"
date: 2024-12-26T21:04:46+08:00
draft: false
categories:
  - Dubbo
---

# Dubbo 集成 Spring Security 和 OAuth2

这份记录围绕授权服务器和 Dubbo 资源服务搭建示例，并测试携带令牌与未携带令牌的请求。

## 角色与集成点

Spring Security 提供认证和访问控制能力。OAuth2 中，授权服务器颁发访问令牌，客户端携带令牌访问资源服务器，资源服务器验证令牌和访问权限。

Dubbo 侧通过实现 `Filter` 和 `org.apache.dubbo.rpc.protocol.tri.rest.filter.RestExtension`，再注册 SPI，把校验接到 REST 请求链路。

## 授权服务器

示例使用默认安全配置，再配置授权服务器和端点信息。具体端点与默认安全行为以项目使用的 Spring Authorization Server 版本为准。

```java
@Bean
public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {
    OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);

    return http.build();
}
```

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

## 资源服务器

`OAuthFilter` 实现过滤接口，并通过 `@Activate` 激活。`doFilter` 校验请求中的令牌，成功后继续处理，否则拒绝访问。

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

### 发现授权服务器与公钥

授权服务器元数据提供 `jwks_uri`，资源服务器通过该地址获取用于验签的公钥。

```json
// 20241228173022
// http://localhost:9000/.well-known/oauth-authorization-server

{
  "issuer": "http://localhost:9000",
  "authorization_endpoint": "http://localhost:9000/oauth2/authorize",
  "device_authorization_endpoint": "http://localhost:9000/oauth2/device_authorization",
  "token_endpoint": "http://localhost:9000/oauth2/token",
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post",
    "client_secret_jwt",
    "private_key_jwt"
  ],
  "jwks_uri": "http://localhost:9000/oauth2/jwks",
  "response_types_supported": [
    "code"
  ],
  "grant_types_supported": [
    "authorization_code",
    "client_credentials",
    "refresh_token",
    "urn:ietf:params:oauth:grant-type:device_code"
  ],
  "revocation_endpoint": "http://localhost:9000/oauth2/revoke",
  "revocation_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post",
    "client_secret_jwt",
    "private_key_jwt"
  ],
  "introspection_endpoint": "http://localhost:9000/oauth2/introspect",
  "introspection_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post",
    "client_secret_jwt",
    "private_key_jwt"
  ],
  "code_challenge_methods_supported": [
    "S256"
  ]
}
```

```json
// 20241228173230
// http://localhost:9000/oauth2/jwks

{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "kid": "8e37caeb-1505-48b6-8fe2-2f49796b6a07",
      "n": "ljHIB4ZEP8nxu5Wurn97Kf35SuwLzQE5WcASzXT7qUxQkRHNRTAqjVUxHpwiEh7_6h-dO8-VTEcAsoifSsSR3ry949V5iXUPqcw2RtOANkb2jcIYwKvGrJvFikNWsU5R9pTzNj8JL-UizRSqLfYfBEsfYx6CZowaALbTUUmx0LzBcXmnvOaxS2IgJ6pD5CDJWyTD62dQeZTBxMeGvBvJi8y7yhu_ANzivEkbnx-QogRCBzwSqpAzAe4DDbaU0iAbBrDZT17uynlSpiLbN0RnsyiD3X6RDSKr7PyG_2rI_wkqDfiV4RqoIvOYwQHH27zNzO5tC8k_sGeOVK1_ydAEuw"
    }
  ]
}
```

客户端在 `Authorization` 中发送的是访问令牌，不是私钥。对于这里的非对称签名 JWT，资源服务器用公钥验证签名；令牌验证还需要检查签发者、接收方、有效期和所需权限，不能只凭签名通过就放行。

## 测试记录

测试参数：

```java
private final String clientId = "49fd8518-12eb-422b-9264-2bae0ab89f66";
private final String clientSecret = "H3DTtm2fR3GRAdr4ls1mcg";

private static final String OAUTH2HOST = System.getProperty("authorization.address", "localhost");
private static final String HOST = System.getProperty("resource.address", "localhost");
```

携带令牌访问：

```java
@Test
public void testGetUserEndpoint() {
    String credentials = clientId + ":" + clientSecret;
    String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes());

    // build RestClient request
    RestClient restClient = RestClient.builder().build();
    String url = "http://" + OAUTH2HOST + ":9000/oauth2/token";

    try {
        // make a post request
        String response = restClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Basic " + encodedCredentials)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body("grant_type=client_credentials&scope=read")
                .retrieve()
                .body(String.class);

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(response);
        String accessToken = jsonNode.get("access_token").asText();

        // Use the access token to authenticate the request to the /user endpoint
        assert accessToken != null;
        String userUrl = "http://" + HOST + ":50051/hello/sayHello/World";
        try {
            String userResponse = restClient.get()
                    .uri(userUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(String.class);

            assertEquals("\"Hello, World\"", userResponse, "error");
        } catch (RestClientResponseException e) {
            System.err.println("Error Response: " + e.getResponseBodyAsString());
            Assertions.fail("Request failed with response: " + e.getResponseBodyAsString());
        }

    } catch (JsonProcessingException e) {
        throw new RuntimeException(e);
    }
}
```

未携带有效令牌访问：

```java
@Test
public void testGetUserEndpointWithInvalidToken() {
    String invalidAccessToken = "invalid_token";
    RestClient restClient = RestClient.builder().build();
    String userUrl = "http://" + HOST + ":50051/hello/sayHello/World";

    try {
        restClient.get()
                .uri(userUrl)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + invalidAccessToken)
                .retrieve()
                .body(String.class);

        Assertions.fail("Request should have failed with an invalid token");
    } catch (RestClientResponseException e) {
        System.err.println("Error Response: " + e.getResponseBodyAsString());
        assertEquals(401, e.getStatusCode().value(), "Expected 401 Unauthorized status");
    }
}
```
