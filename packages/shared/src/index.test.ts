import { describe, expect, it } from "vitest";
import { can, formatPhone, messageIdempotencyKey, normalizePhone, phoneMatchKey, slugify } from "./index";

describe("normalização de telefone", () => {
  it("normaliza celular brasileiro com máscara", () => {
    expect(normalizePhone("(11) 98452-9901")).toBe("+5511984529901");
  });

  it("mantém número já em E.164", () => {
    expect(normalizePhone("+55 11 98452-9901")).toBe("+5511984529901");
  });

  it("remove prefixo 0055", () => {
    expect(normalizePhone("0055 11 3290-8800")).toBe("+551132908800");
  });

  it("considera 8 e 9 dígitos equivalentes para duplicidade", () => {
    expect(phoneMatchKey("(11) 98452-9901")).toBe(phoneMatchKey("(11) 8452-9901"));
  });

  it("formata para exibição", () => {
    expect(formatPhone("+5511984529901")).toBe("(11) 98452-9901");
  });
});

describe("permissões", () => {
  it("owner pode tudo", () => {
    expect(can("owner", "settings:manage")).toBe(true);
    expect(can("owner", "whatsapp:connect")).toBe(true);
  });
  it("support não pode excluir clientes", () => {
    expect(can("support", "customers:delete")).toBe(false);
  });
  it("seller pode enviar mensagens mas não configurar IA", () => {
    expect(can("seller", "whatsapp:send")).toBe(true);
    expect(can("seller", "ai:configure")).toBe(false);
  });
  it("papel desconhecido não tem permissões", () => {
    expect(can("intruso", "customers:read")).toBe(false);
  });
});

describe("utilidades", () => {
  it("gera chave de idempotência estável", () => {
    expect(messageIdempotencyKey({ provider: "baileys", externalChatId: "5511", externalMessageId: "ABC" })).toBe(
      "baileys:5511:ABC",
    );
  });
  it("slugifica nomes com acentos", () => {
    expect(slugify("Nexus CRM Ação")).toBe("nexus-crm-acao");
  });
});
