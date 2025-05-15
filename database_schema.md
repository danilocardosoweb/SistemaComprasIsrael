# Esquema do Banco de Dados - Divino Vendas App

## Tabelas

### clientes
| Coluna      | Tipo      | Descrição                                  |
|-------------|-----------|-------------------------------------------|
| id          | uuid      | Identificador único (PK)                  |
| nome        | text      | Nome do cliente                           |
| email       | text      | Email do cliente (opcional)               |
| telefone    | text      | Telefone do cliente (opcional)            |
| created_at  | timestamp | Data e hora de criação do registro        |

### produtos
| Coluna      | Tipo      | Descrição                                  |
|-------------|-----------|-------------------------------------------|
| id          | uuid      | Identificador único (PK)                  |
| nome        | text      | Nome do produto                           |
| preco       | numeric   | Preço unitário do produto                 |
| estoque     | integer   | Quantidade disponível em estoque          |
| descricao   | text      | Descrição do produto (opcional)           |
| categoria   | text      | Categoria do produto (opcional)           |
| created_at  | timestamp | Data e hora de criação do registro        |

### vendas
| Coluna          | Tipo      | Descrição                                  |
|-----------------|-----------|-------------------------------------------|
| id              | uuid      | Identificador único (PK)                  |
| cliente_id      | uuid      | Referência ao cliente (FK)                |
| cliente_nome    | text      | Nome do cliente (para facilitar consultas)|
| total           | numeric   | Valor total da venda                      |
| forma_pagamento | text      | Forma de pagamento (pix, dinheiro, cartão)|
| comprovante_url | text      | URL do comprovante de pagamento (opcional)|
| data_venda      | timestamp | Data e hora da venda                      |
| created_at      | timestamp | Data e hora de criação do registro        |

### itens_venda
| Coluna          | Tipo      | Descrição                                  |
|-----------------|-----------|-------------------------------------------|
| id              | uuid      | Identificador único (PK)                  |
| venda_id        | uuid      | Referência à venda (FK)                   |
| produto_id      | uuid      | Referência ao produto (FK)                |
| produto_nome    | text      | Nome do produto (para facilitar consultas)|
| quantidade      | integer   | Quantidade vendida                        |
| preco_unitario  | numeric   | Preço unitário no momento da venda        |
| subtotal        | numeric   | Subtotal do item (preço x quantidade)     |

## Relacionamentos

- `clientes` 1:N `vendas` (Um cliente pode ter várias vendas)
- `vendas` 1:N `itens_venda` (Uma venda pode ter vários itens)
- `produtos` 1:N `itens_venda` (Um produto pode estar em vários itens de venda)

## Índices

- `clientes`: índice em `nome` para facilitar buscas
- `produtos`: índice em `nome` e `categoria` para facilitar buscas
- `vendas`: índice em `cliente_id` e `data_venda` para facilitar buscas
- `itens_venda`: índice em `venda_id` e `produto_id` para facilitar buscas

## Bucket de Storage

### vendas
Bucket para armazenar os comprovantes de pagamento das vendas.
Caminho: `comprovantes/{timestamp}_{nome_do_arquivo}`
