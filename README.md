# Linha

Uma primeira versão de um espaço de trabalho para analistas de futebol. Regista os acontecimentos de um jogo, com minuto e segundo, jogador e localização, e partilha o registo com a vista do banco através de Server-Sent Events.

![Painel de dia de jogo da Linha](docs/painel.png)

## Desenvolvimento

Requer Node.js 22 ou superior e npm. Na raiz do repositório:

```sh
npm ci --cache /tmp/linha-npm-cache
npm run dev
```

O servidor usa a porta 3000 por predefinição. `PORT` permite selecionar outra porta. O mesmo servidor serve a interface e a API, incluindo a ligação em direto. Para abrir a vista do banco, seleciona **Banco** no painel, ou usa o caminho `/?view=bench` no mesmo servidor acessível ao dispositivo. Os dispositivos têm de conseguir chegar a esse servidor; a aplicação não cria um endereço público nem contorna as regras de rede.

```sh
npm test
npm run build
npm start
```

`npm start` serve o resultado de produção de `npm run build`. As fontes Inter e os ícones SVG são servidos localmente, sem serviços externos em tempo de execução.

## Ver a aplicação

Para uma pré-visualização da versão compilada, executa `npm run build` e depois `npm run preview` na raiz do projeto. O servidor serve a interface e a API na porta 3000, em todas as interfaces de rede. Se a ferramenta de pré-visualização permitir escolher uma porta, seleciona 3000. Reinicia o servidor quando o ambiente for restaurado: os ficheiros são preservados, mas os processos ativos não.

Um serviço de alojamento apenas de ficheiros estáticos não é suficiente para esta aplicação, porque o registo de eventos e a atualização em direto dependem do servidor Node.js. A vista do banco usa `/?view=bench` no mesmo servidor. Em desenvolvimento, se o proxy de pré-visualização usar um hostname externo, adiciona esse hostname específico à configuração `server.allowedHosts` do Vite; a versão compilada não depende do servidor de desenvolvimento do Vite.

## Fluxo de jogo

1. Escolhe a equipa e a ação. As teclas **1–8** também abrem o registo, quando não tens um controlo selecionado.
2. O instante fica capturado ao escolher a ação. Podes corrigir esse tempo, escolher um jogador, selecionar a zona do campo e acrescentar uma nota.
3. Guarda o evento. O resultado e as estatísticas atualizam-se em todas as vistas ligadas ao servidor.
4. **Espaço** inicia ou pausa o cronómetro. O botão de ajuste permite acertar o tempo e passar à segunda parte, em pausa aos 45:00.
5. **Anular último** remove o último evento que registaste nesta sessão. No histórico podes eliminar outros eventos, com confirmação.
6. A exportação CSV inclui tempo, parte, equipa, jogador, localização, resultado do remate e notas.

O campo no formulário também aceita as setas do teclado; Enter seleciona o centro. O foco fica na janela de registo até a fechares.

## Dados e limites desta versão

O jogo, os plantéis e os emblemas são de demonstração; os jogadores são fictícios. O cronómetro começa em pausa aos 32:18. Os eventos são guardados em `.local/match.json`, uma pasta ignorada pelo Git. `MATCH_DATA_DIR` permite selecionar uma pasta diferente. Os dados sobrevivem ao reinício do servidor. A persistência usa um ficheiro JSON e destina-se a uma única instância do servidor.

Os golos contam como remates e remates à baliza. O gráfico de ritmo mostra o volume dos eventos efetivamente registados em blocos de cinco minutos, não uma estimativa de posse, pressão ou xG. As coordenadas são percentagens de um campo fixo: o Sporting ataca para a direita e o Porto para a esquerda na demonstração. Ainda não há inversão automática de campo entre partes.

Esta versão não inclui autenticação nem permissões no servidor. A vista do banco é de leitura na interface; não constitui controlo de acesso à API. Não expor a aplicação a uma rede pública com dados reais antes de implementar autenticação, autorização e sessões separadas de jogo. Ainda não há modo offline: os controlos de escrita são desativados quando a ligação se perde, e o registo continua quando a ligação regressa.

## Próximas decisões de produto

- Configuração de jogos, equipas e plantéis reais; substituições e mudanças de direção de ataque.
- Acessos de analista e banco, com permissões no servidor e ligações por jogo.
- Registo rápido de sequências, com seleção do jogador por número e filas de eventos.
- Registo offline com sincronização e resolução de conflitos.
- Marcadores para vídeo e clipes; métricas adicionais apenas quando a recolha as suporte.
