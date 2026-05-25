# Regras de Dominio

## Objetivo

Documentar as regras de negocio que o backend garante e que impactam diretamente o comportamento do frontend.

## Principios de contrato

- backend e fonte da verdade para sessao, score, XP, nivel e moderacao
- payload publico nunca pode vazar gabarito
- error.code faz parte do contrato funcional
- regras criticas devem ser cobertas por teste

## Auth e sessoes

### Regras

- accessToken autentica chamadas protegidas
- refreshToken so pode ser usado para refresh e logout
- refresh token e rotativo
- refresh antigo reutilizado deve falhar
- sessao revogada ou expirada invalida access token
- OAuth exige validacao de state
- identidade OAuth e composta por provider + oauthId
- email vinculado a outro provider OAuth nao e sobrescrito automaticamente

### Impacto para frontend

- persistir refresh token em storage seguro
- tratar 401 com tentativa de refresh apenas uma vez por requisicao
- ao falhar refresh, limpar estado autenticado e redirecionar para login

## Perguntas

### Regras

- somente perguntas approved aparecem nas rotas publicas
- perguntas oficiais e geradas por IA usam 5 opcoes como padrao editorial
- API aceita de 2 a 6 opcoes para manter flexibilidade de integracao
- listagem retorna bodyPreview, nao body completo
- detalhe publico retorna body + options
- correctOptionIndex nunca aparece em payload publico
- criacao e edicao validam corretude de correctOptionIndex
- edicao e remocao so para autor ou admin

### Impacto para frontend

- usar lista para feed e detalhe para tela de resolucao
- nao depender de gabarito no cliente
- validar selectedOptionIndex localmente antes de enviar tentativas

## Quizzes

### Regras

- questionIds de criacao devem ser unicos
- quiz publico so pode ser lido por qualquer usuario quando `isPublic=true` e `status=approved`
- quiz criado manualmente nasce `pending`
- quiz gerado por IA nasce `pending`
- submit de quiz privado ou pendente e permitido para criador e admin
- tentativa deve responder todas as perguntas exatamente uma vez
- respostas duplicadas falham
- resposta fora do escopo do quiz falha
- indice de opcao invalido falha
- score e calculado exclusivamente no backend
- usuario comum responde apenas perguntas approved
- listagem/detalhe com token valido pode indicar `attemptedByViewer`, melhor score e ultima tentativa

### Impacto para frontend

- bloquear envio de tentativa incompleta
- impedir duplicacao de questionId no payload
- sempre renderizar resultado retornado pelo backend como oficial
- tratar quiz recem-criado como item de revisao, nao como item publico imediato

## XP, nivel e progresso

### Regras

- dificuldades: beginner, easy, medium, hard, expert
- XP por primeira resposta correta da questao:
  - beginner: 5
  - easy: 10
  - medium: 15
  - hard: 25
  - expert: 40
- quiz perfeito concede +100 XP somente quando todas as perguntas eram novas para o usuario
- bonus de alta avaliacao da pergunta concede +25 XP ao autor, uma unica vez
- nivel e recalculado a cada ganho de XP
- questao passa a ser considerada respondida na primeira tentativa, correta ou incorreta

### Impacto para frontend

- nao estimar XP final no cliente como valor definitivo
- usar xpGained retornado pelo submit de quiz
- ao repetir quiz, aceitar xpGained igual a 0 como comportamento esperado

## Ratings e moderacao

### Regras

- usuario tem no maximo uma avaliacao por pergunta
- nova avaliacao substitui a anterior
- usuario pode reportar a mesma pergunta uma unica vez
- auto-aprovacao de pergunta pendente quando:
  - ratingCount >= 5
  - avgRating >= 3.5
- auto-rejeicao de pergunta pendente quando:
  - ratingCount >= 10
  - avgRating < 2.0
- rejeicao automatica por report quando pendente e com 3+ reports
- admin pode aprovar/rejeitar perguntas manualmente
- admin pode aprovar/rejeitar quizzes manualmente
- aprovar quiz exige perguntas vinculadas aprovadas ou `approveQuestions=true`
- conteudo IA nunca fica publico sem aprovacao

### Impacto para frontend

- permitir atualizar avaliacao sem criar duplicidade na UI
- tratar report duplicado (QUESTION_DUPLICATE_REPORT) como estado final ja reportado
- mostrar status de revisao para fluxos admin
- ao aprovar quiz, oferecer opcao explicita de aprovar perguntas vinculadas

## Modo livre

### Regras

- GET /practice/questions retorna apenas perguntas approved
- payload de pratica nao expoe correctOptionIndex nem explanation antes da resposta
- excludeAnswered=true exige usuario autenticado, salvo quando includeAnswered=true
- POST /practice/answer aceita anonimo: retorna feedback (isCorrect, correctOptionIndex, explanation) sem registrar progresso nem conceder XP
- resposta correta de autenticado concede XP somente na primeira resposta daquela pergunta
- modo livre nao concede bonus de quiz perfeito

### Impacto para frontend

- usar modo livre para treino rapido fora de um quiz fixo
- apos responder, usar correctOptionIndex e explanation retornados pelo backend para feedback
- aceitar alreadyAnswered=true e xpGained=0 como repeticao esperada
- para anonimos, sempre considerar alreadyAnswered=false e xpGained=0

## Acesso anonimo (sem token)

### Regras

- pode listar e ver detalhe de perguntas e quizzes publicos aprovados
- pode submeter tentativa de quiz; resposta vem com `saved: false`, `xpGained: 0`, sem persistir em quiz_attempts
- pode responder pergunta em modo livre; resposta vem com feedback, mas sem persistir progresso e sem XP
- pode acessar URLs assinadas de imagem em `GET /v1/uploads/*`
- nao pode criar, editar ou remover perguntas/quizzes
- nao pode avaliar, reportar ou usar IA
- nao pode acessar perfil privado, historico, leaderboard de proprio usuario, change-password ou admin

### Impacto para frontend

- a UI publica deve funcionar sem usuario; CTAs de "criar conta" entram nas acoes restritas
- ao receber `saved: false`, mostrar resultado mas convidar o usuario a logar para salvar progresso e ganhar XP
- nao depender de `quizAttempt.id` na resposta anonima (pode vir como null)

## Recuperacao e mudanca de senha

### Regras

- usuario autenticado pode trocar a propria senha em `POST /v1/auth/change-password`
- mudanca de senha bem-sucedida revoga todas as outras sessoes ativas; a sessao atual continua valida
- contas OAuth-only (sem passwordHash) recebem 400 ao tentar trocar senha
- admin pode forcar reset em `POST /v1/admin/users/:id/reset-password`; se `password` for omitido, o servidor gera uma temporaria de 12 caracteres
- reset por admin revoga todas as sessoes do alvo, incluindo a propria sessao se for a do admin
- nao existe flow de "esqueci minha senha" por email; o caminho oficial e contato com admin

### Impacto para frontend

- exigir senha atual ao trocar a propria senha
- exibir a temporaria retornada por admin uma unica vez na UI (nunca persistir em log/clipboard automatico)
- apos reset, o usuario alvo precisa relogar; clientes devem tratar 401 normalmente

## Visibilidade e privacidade

- perfil publico nao inclui email
- historico de tentativas nao e publico
- /users/:id/history e permitido apenas para o proprio usuario ou admin

## Regras de acesso por perfil

| Area | Publico | Autenticado | Admin |
| --- | --- | --- | --- |
| Feed de perguntas/quizzes | Sim | Sim | Sim |
| Responder quiz | Sim (sem XP/historico) | Sim, com XP e historico | Sim |
| Criar/editar perguntas | Nao | Autor | Admin tambem pode editar/remover |
| Criar/editar quizzes | Nao | Criador | Admin pode remover |
| Avaliar/reportar pergunta | Nao | Sim | Sim |
| Gerar conteudo por IA | Nao | Nao | Sim |
| Revisar conteudo | Nao | Nao | Sim |
| Modo livre | Responder com feedback (sem XP) | Responder e registrar progresso | Sim |
| Historico de usuario | Nao | Dono | Admin |
| Mudar propria senha | Nao | Sim | Sim |
| Resetar senha de outro usuario | Nao | Nao | Sim |
| Editar proprio perfil | Nao | Sim (PATCH /users/me) | Sim |

## Decisoes de produto ainda abertas

- politicas futuras de modo de quiz (treino, prova, competitivo)
- flow de recuperacao de senha por email (hoje depende de admin)
