# Contratos REST, eventos e cenários

## Convenções

Base `/api`, JSON. Endpoints simulados por [handlers MSW](../src/mocks/handlers.ts), não por um servidor remoto. `fetch`/Axios no navegador controlado pelo worker alcançam a simulação; `curl /api/...` fora desse navegador não acessa o banco MSW. A aplicação chama REST por [Axios](../src/api/client.ts).

Autorização privada: `Authorization: Bearer <token>`. Ausência/expiração retorna 401; recurso de outro usuário retorna 403 onde aplicável. Datas em ISO UTC. IDs são strings estáveis de até 96 caracteres; versões são inteiros positivos. Quantidades são inteiras de 1 a 99. Valores ETH são strings decimais canônicas, até 18 casas, com cálculo inteiro em wei.

Os schemas em [src/schemas/api](../src/schemas/api) e os schemas de [conta](../src/schemas/account.ts), [colecionador](../src/schemas/collector.ts) e [demonstração](../src/schemas/demo.ts) são a referência executável dos campos e limites.

### Erros

```json
{
  "error": {
    "code": "VALIDATION",
    "fields": { "email": "emailTaken" }
  }
}
```

`fields` é opcional; suas chaves identificam campos e os valores são códigos para tradução. Não se deve exibir HTML ou assumir sucesso quando o JSON não atende ao schema.

| Status / camada | Significado                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| 400             | JSON inválido (`VALIDATION`)                                                |
| 401             | `UNAUTHORIZED`: token ausente, inválido ou expirado / credenciais inválidas |
| 403             | `FORBIDDEN`: dono/contexto sem permissão                                    |
| 404             | `NOT_FOUND`: recurso inexistente                                            |
| 409             | `CONFLICT`, `CART_CHANGED`, `STOCK_CHANGED` ou `SCENARIO_RESET`             |
| 422             | `VALIDATION`, `COUPON_INVALID`, `COUPON_EXPIRED`                            |
| 503             | `UNAVAILABLE`: indisponibilidade simulada                                   |
| Cliente         | `NETWORK`, `TIMEOUT` ou `CONTRACT`, sem inventar um status HTTP             |

Respostas bem-sucedidas dos handlers utilizam HTTP 200; não se deve pressupor 201/204 apenas pelo método. Recurso cujo schema mudou de forma incompatível gera `CONTRACT` no cliente.

## Sessão, conta e favoritos

| Método e caminho      | Corpo / resposta                              | Acesso          |
| --------------------- | --------------------------------------------- | --------------- |
| `POST /auth/register` | `{username,email,password,confirm}` → Session | Público         |
| `POST /auth/login`    | `{email,password}` → Session                  | Público         |
| `GET /session`        | Session                                       | Privado         |
| `POST /auth/logout`   | `{}` → `{revoked:true}`                       | Token da sessão |
| `GET /profile`        | Profile                                       | Privado         |
| `PATCH /profile`      | ProfileUpdate → Profile                       | Privado         |
| `GET /wallets`        | SavedWallet[]                                 | Privado         |
| `POST /wallets`       | WalletWrite → SavedWallet[]                   | Privado         |
| `PATCH /wallets/:id`  | WalletWrite com versão → SavedWallet[]        | Privado/dono    |
| `GET /favorites`      | `{userId,nftIds,version}`                     | Privado         |
| `POST /favorites`     | `{nftId}` → favoritos atualizados             | Privado         |
| `DELETE /favorites`   | `{nftId}` → favoritos atualizados             | Privado         |

Session: `{token,user:{id,username,email,displayName},expiresAt}`. Senha de cadastro: 8–128 caracteres, letra e número; confirmação igual. Username: 3–20 caracteres, letras maiúsculas/minúsculas, números, ponto, hífen e underscore; unicidade sem distinguir caixa. E-mail também é comparado sem distinguir caixa.

Profile contém os campos de usuário, `ens`, `walletNickname`, `avatar` e `version`. ProfileUpdate envia `displayName`, `username`, `email`, `ens`, `walletNickname`, `avatar`, `version`, `currentPassword`, `newPassword`, `confirmPassword`. Sem alteração de senha, os três campos de senha ficam vazios. Avatar é data URL validada; upload aceita JPEG/PNG/WebP até 2 MiB. Atualização concorrente ou identidade duplicada é conflito.

WalletWrite: `{draft,primary,sameAsPrimary,version?}`. Draft contém `displayName`, `walletNickname`, `network`, `profileName`, `address`, `secondary`, `walletType`, `referral`, `email`, `ens`. Rede: Ethereum/Polygon/Solana; tipo: WalletConnect/MetaMask/Coinbase Wallet. Endereços EVM: `0x` + 40 hexadecimais; Solana: base58 de 32–44 caracteres. ENS deve terminar em `.eth`. Campo secundário é opcional. No máximo uma carteira principal e uma secundária por conta; secundária exige principal. PATCH preserva o papel e exige versão atual. Duplicata na mesma rede é conflito.

SavedWallet contém `{id,userId,primary,sameAsPrimary,label,draft,version}`. A resposta completa permite atualizar seleção/edição sem perder a outra carteira.

## Catálogo e detalhe

| Método e caminho | Resultado                                                  |
| ---------------- | ---------------------------------------------------------- |
| `GET /nfts`      | `{facets:{categories,networks},items,total,page,pageSize}` |
| `GET /nfts/:id`  | NFT ou 404                                                 |

Parâmetros de listagem:

| Campo        | Valores / padrão                                       |
| ------------ | ------------------------------------------------------ |
| `q`          | Busca textual, até 120 caracteres; vazio               |
| `categories` | Lista por vírgulas ou parâmetros repetidos             |
| `networks`   | Ethereum, Polygon, Solana; lista por vírgulas/repetida |
| `min`, `max` | Strings ETH; mínimo não pode exceder máximo            |
| `tab`        | `all`, `new`, `hot`; padrão all                        |
| `sort`       | `recent`, `lowest`, `highest`, `name`; padrão recent   |
| `page`       | 1–1000; padrão 1                                       |
| `pageSize`   | 1–36; padrão 9                                         |

Categorias: `digitalArt`, `photography`, `music`, `art3d`, `collectibles`, `generative`, `games`, `subscriptions`, `utility`. Facets representam as contagens do catálogo do cenário, mantendo os controles estáveis durante filtragem. Empates de ordenação usam identificador para resultado determinístico.

NFT: `id`, `title`, `image`, `imageAltKey`, `price`, `previousPrice?`, `rare?`, `category`, `network`, `isNew`, `hot`, `token`, `editions`, `version`, `publishedAt`. Edição: `{id,available,limit}`, com IDs `1/1`, `1/10`, `1/50`, `open`. `available` não excede `limit`.

Exemplo: `/api/nfts?q=ape&networks=Ethereum,Polygon&sort=lowest&page=1&pageSize=9`.

## Carrinho e cotação

Carrinho é público para visitante ou privado para conta, conforme token. Itens identificam NFT + edição; linhas incluem dados atuais do NFT, disponibilidade e validade de estoque.

| Método e caminho         | Corpo / resultado                                            |
| ------------------------ | ------------------------------------------------------------ |
| `GET /cart`              | CartResponse                                                 |
| `POST /cart/items`       | `{nftId,editionId,quantity}` → CartResponse                  |
| `PATCH /cart/items/:id`  | `{cartVersion,quantity}` → CartResponse                      |
| `DELETE /cart/items/:id` | `{cartVersion}` → CartResponse                               |
| `POST /cart/coupon`      | `{cartVersion,code}` → CartResponse                          |
| `DELETE /cart/coupon`    | `{cartVersion}` → CartResponse                               |
| `POST /cart/quote`       | `{cartVersion,resourceVersions,network}` → Quote de resumo   |
| `POST /quotes`           | `{cartVersion,walletId,network,coupon?}` → Quote autenticada |

CartResponse: `{id,userId,items,version,coupon,mergeNotice,lines,stockValid}`. `mergeNotice` é `none`, `merged` ou `partial`. `resourceVersions` mapeia ID de NFT para versão positiva; impede aceitar um resumo feito com um catálogo antigo.

Quote: `{id,userId,cartId?,walletId,network,coupon,resourceVersions,requiresReview,cartVersion,items,totals,expiresAt,version}`. Itens são snapshots com `{nft,editionId,quantity,unitPrice,subtotal}`. Totals: `{subtotal,discount,fee,total}`; invariantes verificam soma de linhas e `subtotal - discount + fee = total`. Validade de dois minutos. Moeda permanece ETH fictício também nas redes alternativas da simulação.

```json
{
  "cartVersion": 3,
  "resourceVersions": { "emerald-ape-042": 1 },
  "network": "Ethereum"
}
```

Esse exemplo é a entrada de `/cart/quote`; IDs/versões reais devem vir das respostas atuais. `KURIO10` concede 10%; `EXPIRADO` está vencido. Os cenários podem forçar falha independentemente do código informado.

## Conexão de carteira e pedidos

| Método e caminho                 | Corpo / resultado                                  | Acesso             |
| -------------------------------- | -------------------------------------------------- | ------------------ |
| `POST /wallet-connections`       | `{walletId,address,network,provider}` → Connection | Privado            |
| `DELETE /wallet-connections/:id` | `{disconnected:true}`                              | Privado/dono/token |
| `POST /orders`                   | OrderInput + Idempotency-Key → Order               | Privado            |
| `GET /orders`                    | Order[] do usuário                                 | Privado            |
| `GET /orders/:id`                | Order                                              | Privado/dono       |

`walletId` da conexão pode ser nulo para conexão externa simulada; provider segue os tipos da carteira. Connection: entrada + `{id,userId,token,connected}`. A conexão é vinculada ao token atual e não representa autorização de uma carteira real.

OrderInput:

```json
{
  "quoteId": "id-retornado-pela-cotacao",
  "walletId": "id-da-carteira-ou-external",
  "connectionId": "id-da-conexao-simulada",
  "collector": {
    "displayName": "Alex Silva",
    "username": "alexsilva",
    "network": "Ethereum",
    "profileName": "Minha coleção",
    "address": "0x1111111111111111111111111111111111111111",
    "secondary": "",
    "walletType": "MetaMask",
    "referral": "KURIO",
    "email": "alex@example.com",
    "ens": "alex.eth",
    "note": ""
  }
}
```

Header `Idempotency-Key`: 16–128 caracteres alfanuméricos/hífen; a UI usa UUID. O escopo da chave é o usuário. Mesmo corpo/chave recupera o mesmo pedido; corpo diferente com a chave já usada retorna 409. Existe no máximo um pedido pendente por usuário. Timeout após persistir não desfaz a criação.

Order: `{id,userId,status,quoteId,walletId,network,items,totals,reference,walletAddress,walletProvider,collector?,createdAt,updatedAt,version}`. Status: `pending`, `confirmed`, `declined`. Confirmado exige referência simulada. Itens/totais são snapshots imutáveis; mudanças posteriores no catálogo não alteram recibos. Referência `sim-…` não deve ser aberta como transação real em explorer público.

## Eventos Socket.IO

Cliente em origem atual, path `/socket.io/`, transporte WebSocket. Handshake inclui `generation` e sessão. Binding `@mswjs/socket.io-binding` sobre WebSocket MSW; nenhum servidor externo, long-polling ou broadcast entre documentos. [Implementação do cliente](../src/services/realtime.ts) e [mock](../src/mocks/realtime.ts).

| Evento          | Envelope                                                | Reação                                               |
| --------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `nft.updated`   | `{type,eventId,resourceId,version,generation,data:Nft}` | Reconsultar catálogo/detalhe/carrinho/cotação ativos |
| `order.updated` | Campos acima + `userId`, `data:Order`                   | Reconsultar pedido próprio e refletir estado real    |

`eventId` e `generation` são UUIDs; ID/versão do envelope devem coincidir com o payload. Evento de pedido deve coincidir com o dono. Geração/sessão errada, schema inválido, duplicata, versão antiga e regressão de terminal são ignorados. Após reconexão, REST reconcilia recursos ativos; não se presume que todos os eventos perdidos serão reproduzidos.

## Cenários e controle da demonstração

| Método e caminho        | Entrada / resultado                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `GET /demo`             | `{scenario,generation,session,pendingOrderId}`                                        |
| `POST /demo/start`      | `{scenario}` → prepara demonstração guiada, podendo reiniciar dados e sessão fictícia |
| `POST /demo/reset`      | `{scenario}` → aplica/reset conforme família de cenário                               |
| `POST /demo/events`     | `{type,mode?,outcome?,resourceId?}` → evento pelo transporte simulado                 |
| `POST /demo/connection` | `{action:"disconnect"                                                                 | "reconnect"}` → estado de conexão simulado |

O painel oferece apenas cenários compatíveis com o fluxo atual. Cenários privados exigem contexto autenticado no reset; a demonstração guiada pode criar o contexto fictício para mostrar a tela. Restaurar padrão faz reset integral; cenários de conta/pedido/carrinho podem modificar falhas do recurso atual sem apagar todo o banco. A geração identifica o reset integral, invalida respostas antigas e encerra conexões/temporizadores anteriores.

| Família          | Identificadores                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo/rede    | `default`, `empty`, `sold-out`, `slow`, `variable-latency`, `offline`, `timeout`, `server-error`, `unauthorized`, `forbidden`, `malformed-response`, `malformed-event` |
| Sessão/favoritos | `session-expired`, `favorites-failure`, `favorites-ready`                                                                                                              |
| Carrinho         | `cart-empty`, `coupon-invalid`, `coupon-expired`, `quote-failure`, `cart-price-change`, `cart-stock-change`, `cart-ready`, `cart-slow`                                 |
| Conta            | `account-slow`, `account-read-failure`, `account-write-failure`, `account-validation`, `account-ready`                                                                 |
| Pedido/conexão   | `pending-order`, `order-read-failure`, `order-confirmed`, `order-declined`, `order-timeout`, `order-pending`, `connection-refused`                                     |

Latência padrão do catálogo: 40ms; lento: 1200ms; timeout: 6000ms, maior que o timeout Axios de 3000ms. Fora de ordem usa 700ms para busca iniciada por `em`, 40ms para as demais. Os testes controlam relógio e latência onde necessário.

Modos de evento: `normal`, `duplicate`, `stale`, `malformed`, `foreign`, `wrong-generation`. Para pedido, `outcome` pode ser `confirmed` ou `declined`. Esses comandos exercitam a assinatura Socket.IO; não chamam diretamente setters ou escrevem o cache da tela.
