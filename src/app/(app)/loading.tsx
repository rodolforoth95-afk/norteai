// Esqueleto exibido enquanto uma tela do app carrega (ex.: cotações do Mercado).
export default function Carregando() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-superficie" />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="h-44 animate-pulse rounded-2xl bg-superficie" />
        <div className="h-44 animate-pulse rounded-2xl bg-superficie" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-superficie" />
        ))}
      </div>
    </div>
  );
}
