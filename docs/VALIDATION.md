# Validação e evidências

## Publicação conferida em 22/10/2026

| Ambiente / versão | Endereço                                                                                   | SHA conferido                              |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| HML               | https://jungle-gaming-challenge-hml.vercel.app                                             | `54313ec2d3ffd0509ff5c47b6cbdd256457d49ec` |
| PRD               | https://jungle-gaming-challenge-prd.vercel.app                                             | `af2032b937bed79f1d37c82190f5b9679999312f` |
| v1.0.0            | [Tag e release](https://github.com/BragaHigor/jungle-gaming-challenge/releases/tag/v1.0.0) | `af2032b937bed79f1d37c82190f5b9679999312f` |

Os dois `/deployment.json` responderam HTTP 200 com mocks ativos. O [PR #32](https://github.com/BragaHigor/jungle-gaming-challenge/pull/32) integrou develop em main. O [run PRD 39749340066](https://github.com/BragaHigor/jungle-gaming-challenge/actions/runs/39749340066) concluiu gates, publicação/smoke, dry-run e publicação real da v1.0.0.

Esse registro é uma fotografia da conferência: os endereços estáveis podem receber builds posteriores. Consulte `/deployment.json` e os runs para o SHA atual. Docker e esta documentação são complementos posteriores à v1.0.0; sua inclusão e seu próximo deploy dependem do merge correspondente. Não são apresentados como já publicados nessa tag.

## Testes funcionais e smoke

O [CI do PR #32](https://github.com/BragaHigor/jungle-gaming-challenge/actions/runs/39747292996) aprovou **440 E2E em 12,4 minutos** e **dez smoke em 17,4 segundos**, sem falhas ou skips. O build testado pelo PR tem SHA `5f914e7f278a72c832b9dd7c81fab023c23ca7c1`; ele não deve ser confundido com o SHA do merge PRD.

Relatórios copiados do artifact desse run, sem regenerar resultados:

- [E2E — HTML](evidence/e2e/index.html).
- [Smoke — HTML](evidence/smoke/index.html).

Para visualizar após clonar:

```bash
npm exec -- playwright show-report docs/evidence/e2e
npm exec -- playwright show-report docs/evidence/smoke
```

Os HTML do GitHub podem aparecer como código/download; use os comandos acima ou baixe o relatório. Traces são retidos quando há falhas; esses runs aprovados não contêm traces de falha artificiais. Novos testes geram os relatórios nas pastas locais ignoradas pelo Git, sem sobrescrever estas cópias de referência.

O smoke público HML anterior à documentação também aprovou dez casos, incluindo compra/recuperação. Em prova negativa, SHA esperado incorreto causou exit 1. O guard extraído da promoção rejeitou SHA divergente e aceitou o correspondente, sem promover nenhum deployment na prova. As dependências dos jobs impedem promoção/release após gate ou smoke reprovado.

Na conferência adicional da PRD para esta entrega, a preparação do novo smoke de compra foi simplificada: utiliza o cenário padrão, sem enviar um reset de cenário durante o carregamento inicial do checkout. A tentativa inicial teve um timeout desktop; as verificações de compra/carrinho/recibo não foram reduzidas e os timeouts/retries não foram ampliados. Após o ajuste, **16 repetições da compra passaram**, seguidas de **dez smoke completos na PRD em 18,1 segundos**:

- [Repetições de compra — HTML](evidence/purchase-repeated/index.html).
- [Smoke PRD final — HTML](evidence/smoke-prd/index.html), contra o SHA `af2032b937bed79f1d37c82190f5b9679999312f`.

Esses dois relatórios são execuções locais contra a URL pública, distintas dos relatórios CI acima. Não houve alteração no código de negócio da aplicação para esse ajuste.

## Regressão visual

O [workflow visual do PR #32](https://github.com/BragaHigor/jungle-gaming-challenge/actions/runs/39747292973) passou. A cópia de referência local abaixo corresponde à validação final Linux da otimização, com **72 verificações aprovadas**, sem atualização de baselines:

- [Relatório visual — HTML](evidence/visual/index.html).
- [16 baselines versionadas](../tests/__screenshots__) de início, detalhe, carrinho e pagamento em 390/414/768/1440 px.

```bash
npm exec -- playwright show-report docs/evidence/visual
```

Ambiente fixado no workflow: Ubuntu 24.04, imagem oficial Playwright `v1.64.1-noble` por digest, Node 22.19.0 e npm 11.6.0. Há verificações adicionais das nove telas nos dois idiomas. A execução de CI usa `--update-snapshots=none`; atualização de baseline em CI é bloqueada. Esses resultados não afirmam equivalência pixel a pixel com o Figma.

## Docker e checkout limpo

Construção com `npm ci` em estágio isolado, build TypeScript/Vite e inicialização via `docker compose up --build --detach --wait` aprovados. **Dez smoke contra localhost:8080 passaram em 16,3 segundos**, incluindo compra e recuperação de recibo, desktop/mobile, rotas/refresh, imagens/fontes, REST/MSW, Socket.IO e EN.

Conferências adicionais: usuário `nginx`, filesystem somente leitura, capabilities removidas, serviço healthy e `nginx -t` aprovado. Runtime sem Node, código-fonte em `/app` ou `.env`; imagem final de 26.812.408 bytes. Worker serve JavaScript, metadata serve JSON, assets inexistentes retornam 404 e rota SPA direta funciona.

Uma instalação limpa externa do mesmo código-base também aprovou `npm ci`, build e instalação Husky em `.husky/_`; o hook chama `npm run check:commit`. Não é necessário `.env` local, backend privado ou volume de dados Docker.

Os relatórios funcionais e Lighthouse de referência identificam o código anterior ao complemento de preenchimento do checkout. A árvore `src` da v1.0.0 e do commit de performance `69a3adb00f69f5af4be9025e70a27409c4754a79` era `a7ab57117cc7cb12bd74cfaf097790247da1130e`. O preenchimento automático foi adicionado posteriormente, com regressão direcionada registrada abaixo. As auditorias originais foram preservadas, não reapresentadas como novas medições desta alteração.

## Complemento posterior: preenchimento do checkout

Os dados salvos de perfil/carteira passaram a preencher o formulário da própria conta, sem sobrescrever edição manual ou a tentativa de pedido em recuperação. Campos ausentes continuam vazios. Foram adicionados cinco casos, executados em desktop/mobile: perfil salvo e refresh, ausência de dados, troca de carteira com edição preservada, reconciliação e troca de usuário.

Regressão direcionada de checkout/compra/pedidos: **56 testes aprovados**, incluindo os dez novos; smoke local: **dez aprovados**. O teste de validação de campo obrigatório limpa explicitamente o nome já preenchido para continuar exercitando o erro. O teste novo de carteira utiliza o cartão/radio no mobile e select no desktop.

- [Relatório funcional do complemento](evidence/checkout-autofill/index.html).
- [Revalidação dos dez cenários novos no build final](evidence/checkout-autofill-final/index.html): dez aprovados em 27,8 segundos.
- [Comparação visual do checkout](evidence/checkout-autofill-visual/index.html): oito verificações PT-BR/EN em 390/414/768/1440 aprovadas depois de atualizar apenas as quatro baselines desse formulário. A comparação final não atualiza snapshots.

Esses resultados são posteriores aos relatórios CI de referência; não representam uma execução integral de todos os 450 testes nesta branch. Auditorias Lighthouse anteriores não foram recalculadas para essa melhoria.

## Lighthouse

Auditoria local do build completo em 22/10/2026, cenário padrão, PT-BR, imagens/fontes carregadas e transporte MSW ativo. Três execuções por página/perfil: **12 HTML e 12 JSON**, sem selecionar apenas a melhor rodada.

- [Diretório completo dos relatórios](evidence/lighthouse).
- [Medianas e condições em JSON](evidence/lighthouse/summary.json).
- [Resumo original](evidence/lighthouse/summary.md).
- Exemplos HTML: [início mobile](evidence/lighthouse/home-mobile-1.report.html), [detalhe mobile](evidence/lighthouse/detail-mobile-1.report.html), [início desktop](evidence/lighthouse/home-desktop-1.report.html), [detalhe desktop](evidence/lighthouse/detail-desktop-1.report.html).

| Página / perfil   |   P |   A |  BP | SEO | LCP (ms) |   CLS | TBT (ms) |
| ----------------- | --: | --: | --: | --: | -------: | ----: | -------: |
| Início / mobile   |  72 | 100 | 100 | 100 | 4406,573 |     0 |  407,443 |
| Detalhe / mobile  |  74 | 100 | 100 | 100 | 4420,332 |     0 |      359 |
| Início / desktop  |  99 | 100 | 100 | 100 |  941,831 |     0 |     22,5 |
| Detalhe / desktop |  99 | 100 | 100 | 100 |  928,591 | 0,011 |     23,5 |

Metas: P ≥ 90, A ≥ 95, BP ≥ 95 e SEO ≥ 90. **Performance mobile não atendida.** A automação falhou explicitamente nesse gate; a auditoria permanece manual, sem bloquear a entrega. Os limites não foram reduzidos.

Ambiente: Windows build 26200 x64, Intel i7-11800H, 31,77 GiB RAM; Node 22.19.0, npm 11.6.0, Lighthouse 13.5.0, Playwright 1.64.1, Chromium 156. Perfil mobile oficial 412×823, CPU 4× e rede simulada; desktop oficial. Preview em 127.0.0.1:4173, Chrome temporário novo por medição. Versões, throttling, benchmark e avisos completos ficam nos JSONs. O resumo preserva `sha: local`: são medições locais, não auditorias executadas na URL PRD.

As auditorias apontam avaliação de JavaScript, bootstrap/MSW e atraso de renderização do conteúdo principal sob limitação mobile. Os bundles de simulação fazem parte do desafio e não foram retirados da medição. A imagem principal foi reduzida de 221.308 para 35.750 bytes mantendo 450×450; memoização da hero e menos leituras IndexedDB trouxeram ganhos locais. Uma comparação alternada de três execuções por versão teve mediana 67 antes/depois e não demonstrou ganho global consistente de nota. A oscilação de CPU impede atribuir diferenças entre rodadas apenas ao código.

Para reproduzir com a porta 4173 livre:

```bash
npm exec -- playwright install chromium
npm run build
npm run audit:lighthouse
```

O runner inicia/encerra o preview, verifica a prontidão da aplicação, gera `reports/lighthouse` e retorna falha se a mediana não cumprir as metas. Não executar testes/containers de carga concorrentes ao medir. O Docker em 8080 não substitui o preview esperado pelo runner.

## Critérios eliminatórios e limites

| Critério                   | Evidência da entrega                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Uso efetivo da stack       | Camadas de UI, Router/Query, Axios, MSW e Socket.IO documentadas, com testes de transporte          |
| Fluxos funcionais          | E2E de catálogo, conta, favoritos, carrinho, carteiras, compra e recibo; não apenas telas estáticas |
| Confirmação após simulação | Pedido consultado e autorizado, status confirmado e referência; estados pendente/recusado separados |
| Isolamento entre usuários  | Queries por usuário/token, autorização nos handlers e cenários de troca/expiração                   |
| Eventos pelo transporte    | socket.io-client + binding MSW, validação, deduplicação e reconciliação REST                        |
| E2E executável             | Lockfile, scripts, mocks, config Playwright, baselines, CI e relatórios                             |

Os checks obrigatórios do ruleset são Fluxo de branches, Qualidade e Interface em Chromium e Linux, vinculados ao GitHub Actions, com branch atualizada e sem bypass. Relatórios de execução no Actions expiram (sete dias; Lighthouse 14); as cópias versionadas acima ficam disponíveis com o código. Runs e URLs podem evoluir, por isso a identificação de SHA faz parte da conferência.

Limites: sem backend/segurança financeira real, blockchain, gateway ou extensão de carteira; broadcast Socket.IO local ao documento; artes reutilizadas; páginas auxiliares fora do escopo; Performance mobile abaixo da meta. Docker e documentação devem ser integrados pelo fluxo de PR para que passem a compor a entrega publicada.
