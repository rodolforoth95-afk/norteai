// Telefone sempre só com dígitos, com DDI. Celular brasileiro sempre com o 9 na frente:
// o WhatsApp entrega muitos números antigos sem ele (55 11 9999-8888), e o cliente
// digita com ele no site. Assim os dois lados batem.
export function telefoneCanonico(entrada: string): string {
  let d = entrada.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length === 12 && d.startsWith("55") && /[6-9]/.test(d[4]))
    d = `${d.slice(0, 4)}9${d.slice(4)}`;
  return d;
}

export function telefoneBrasileiroValido(entrada: string): boolean {
  const d = telefoneCanonico(entrada);
  return /^55[1-9][0-9]9[0-9]{8}$/.test(d);
}
