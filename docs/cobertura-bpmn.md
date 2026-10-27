# Cobertura BPMN 2.0.2

Requisito do projeto: ampliar o Élan até cobrir o padrão de modelagem solicitado. Esta matriz diferencia funcionalidades implementadas de conformidade integral comprovada. A especificação inclui sintaxe gráfica, semântica, metamodelo, XML e requisitos distintos de conformidade; quantidade de ícones não certifica o conjunto. [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/)

| Família                              | Implementação atual                                                                                                                                                | Verificação / limite                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Processos e colaboração              | Pools, raias, processos, múltiplos documentos e diagramas BPMN.                                                                                                    | Motor bpmn-js; validar arquivos externos e diagramas mistos.                                                                                            |
| Tarefas                              | Task, User, Service, Receive, Send, Script, Manual, BusinessRule.                                                                                                  | Catálogo gráfico e round trip por variante.                                                                                                             |
| Elementos reutilizáveis              | CallActivity, processos reutilizáveis, tarefas globais por Definições.                                                                                             | `calledElement` padrão; não executa chamadas.                                                                                                           |
| Subprocessos                         | Recolhido, expandido, de evento, Transaction, AdHocSubProcess.                                                                                                     | Criação/reabertura; combinações contextuais precisam revisão semântica.                                                                                 |
| Início                               | None, Timer, Message, Signal, Conditional, Multiple, ParallelMultiple; Error/Escalation/Compensate em subprocessos de evento; variantes não interruptivas válidas. | Gatilho, `isInterrupting`, múltiplas definições e contexto explícitos.                                                                                  |
| Intermediários                       | Captura/lançamento conforme tipo: mensagem, sinal, link, compensação, escalação, tempo, condição e múltiplos.                                                      | Catálogo e metamodelo; nenhum ícone é tratado como execução real.                                                                                       |
| Eventos de borda                     | Gatilhos e variantes interruptivas/não interruptivas apropriadas.                                                                                                  | Anexação real a atividades; cancelamento exige transação.                                                                                               |
| Fim                                  | None, Terminate, Message, Signal, Compensate, Escalation, Error, Cancel, Multiple.                                                                                 | Contexto de cancelamento verificado por regra própria.                                                                                                  |
| Gateways                             | Exclusive, Parallel, Inclusive, Complex e três configurações de EventBasedGateway.                                                                                 | Propriedades `instantiate`, `eventGatewayType`, condição e caminho padrão.                                                                              |
| Conexões                             | Sequência, condicional, padrão, mensagem, associação None/One/Both, dados e conversação.                                                                           | Seleção explícita de origem/destino e round trip.                                                                                                       |
| Dados                                | DataObjectReference, coleção, DataStoreReference, DataInput, DataOutput.                                                                                           | IO specification e conjuntos de entrada/saída criados pelo módulo próprio.                                                                              |
| Artefatos                            | Group e TextAnnotation.                                                                                                                                            | Categorização/labels pelo motor. Marcos são extensão Élan, não tipo BPMN normativo.                                                                     |
| Loops                                | StandardLoopCharacteristics e multi-instância sequencial/paralela.                                                                                                 | Condição, cardinalidade, conclusão e compensação editáveis.                                                                                             |
| Definições globais                   | Editor dos tipos concretos RootElement disponíveis no metamodelo: mensagens, sinais, erros, recursos, interfaces, dados, tarefas globais e outros.                 | JSON tipado e referências por ID; validação semântica não é universal.                                                                                  |
| Propriedades sem formulário dedicado | Editor do metamodelo e XML completo, com versionamento antes da aplicação do XML.                                                                                  | Exige conhecimento de BPMN; não substitui uma suíte normativa.                                                                                          |
| Coreografia                          | ChoreographyTask, SubChoreography, CallChoreography, participantes e mensagens via chor-js.                                                                        | Renderização/round trip do exemplo; o projeto upstream declara cobertura de **grande parte**, não da totalidade, da família.                            |
| Conversação                          | Conversation, SubConversation, CallConversation, participantes e ConversationLink.                                                                                 | Renderização, criação, edição, undo e round trip; expansão/navegação complexa e interações entre colaborações ainda exigem ampliação e corpus dedicado. |
| XML / DI                             | Leitura/escrita pelo metamodelo e motor da família; diagrama e semântica preservados nos casos testados.                                                           | Extensões e arquivos externos precisam ser conferidos; leia os avisos de importação.                                                                    |
| Validação                            | Conexões, alcance, eventos, decisões, IDs, temporizadores e algumas regras de contexto.                                                                            | Conjunto de regras, não certificação BPMN.                                                                                                              |
| Simulação                            | Tokens interativos.                                                                                                                                                | Não é motor de execução, análise BPSim nem certificação de semântica operacional.                                                                       |

## Lacunas para afirmar “tudo do BPMN”

- Corpus normativo e de interoperabilidade cobrindo todas as construções e combinações legais da especificação.
- Revisão completa de semântica, cancelamento, compensação, correlação, instância e cenários excepcionais, além dos testes atuais.
- Cobertura gráfica completa de coreografias/conversações complexas e de interações entre colaborações; o upstream de coreografia também declara limitações.
- UX dedicada para todos os detalhes hoje acessíveis apenas pelo editor de metamodelo, Definições ou XML.
- Validação abrangente de schema e regras normativas em tempo de edição.

O requisito de cobertura total permanece visível. Esta versão entrega as funcionalidades descritas e a infraestrutura para ampliá-las, sem rotular uma cobertura parcial como 100%.

## Referências de implementação

- [bpmn-js](https://github.com/bpmn-io/bpmn-js): edição de processos/colaborações e extensão modular.
- [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle): metamodelo e XML.
- [chor-js](https://github.com/bptlab/chor-js): editor especializado de coreografias; sua documentação explicita cobertura parcial.
- `src/catalog.ts`: variantes efetivamente oferecidas.
- `qa/browser.ts`: verificações sobre o editor real.
- `src/validation.ts`: regras locais e seu alcance.

## Correspondência com as capturas fornecidas

| Captura                  | Acesso no Élan                                                          |
| ------------------------ | ----------------------------------------------------------------------- |
| Tipos de tarefa          | Seta ao lado de Tarefa; propriedades para trocar o tipo.                |
| Tipos de gateway         | Seta ao lado de Gateway; configurações de instância no painel.          |
| Eventos finais           | Seta ao lado do evento final.                                           |
| Eventos iniciais         | Seta ao lado do evento inicial.                                         |
| Subprocesso/reutilizável | Seta de Subprocesso e Ferramentas → Reutilizáveis.                      |
| Eventos intermediários   | Seta ao lado do evento intermediário, com captura/lançamento separados. |
| Pool, raia e marco       | Pool, Adicionar raia e Artefatos → Marco/fase.                          |
| Conectores               | Menu Conexões; clique na origem e no destino.                           |
| Diagramas e retorno      | Lista de documentos, abas inferiores e navegação de subprocessos.       |
