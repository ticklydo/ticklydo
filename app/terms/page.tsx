"use client";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();
  const s = {color:"rgba(200,190,255,0.8)",fontFamily:"sans-serif",lineHeight:"1.7"};
  const h = {color:"#f0eeff",fontFamily:"sans-serif",marginTop:"32px",marginBottom:"8px"};
  return (
    <div style={{minHeight:"100vh",background:"#07070f",padding:"40px 20px"}}>
      <div style={{maxWidth:"800px",margin:"0 auto"}}>
        <button onClick={() => router.push("/")} style={{background:"none",border:"none",color:"#c084fc",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"24px"}}>← Späť</button>
        <h1 style={{...h,fontSize:"28px"}}>Podmienky používania</h1>
        <p style={s}>Posledná aktualizácia: 20. 5. 2026</p>

        <h2 style={h}>1. Prevádzkovateľ</h2>
        <p style={s}>TicklyDo, Slovenská republika. Kontakt: support@ticklydo.com</p>

        <h2 style={h}>2. Prijatie podmienok</h2>
        <p style={s}>Používaním TicklyDo súhlasíte s týmito podmienkami. Ak nesúhlasíte, prosím nepoužívajte službu.</p>

        <h2 style={h}>3. Popis služby</h2>
        <p style={s}>TicklyDo je aplikácia na správu taskov, nápady a kalendár. Službu poskytujeme "tak ako je" a vyhradzujeme si právo ju kedykoľvek zmeniť alebo ukončiť.</p>

        <h2 style={h}>4. Váš účet</h2>
        <p style={s}>Za bezpečnosť účtu zodpovedáte vy. Používajte silné heslo a nikomu nezdieľajte prístupové údaje. Jeden účet môže používať len jedna osoba.</p>

        <h2 style={h}>5. Váš obsah</h2>
        <p style={s}>Obsah ktorý vytvoríte patrí vám. Udeľujete nám licenciu na jeho uloženie a zobrazenie výlučne v rámci poskytovania služby. Nezodpovedáme za stratu obsahu.</p>

        <h2 style={h}>6. Zakázané používanie</h2>
        <p style={s}>Zakazuje sa: používanie služby na nezákonné účely, pokus o narušenie bezpečnosti, zdieľanie obsahu porušujúceho práva iných, automatizované scraping dát.</p>

        <h2 style={h}>7. Dostupnosť</h2>
        <p style={s}>Snažíme sa o maximálnu dostupnosť, no negarantujeme nepretržitú prevádzku. Nezodpovedáme za škody spôsobené výpadkom služby.</p>

        <h2 style={h}>8. Platby</h2>
        <p style={s}>Aktuálna verzia TicklyDo je bezplatná. O zavedení platených funkcií vás budeme informovať vopred.</p>

        <h2 style={h}>9. Ukončenie účtu</h2>
        <p style={s}>Svoj účet môžete kedykoľvek vymazať. Vyhradzujeme si právo pozastaviť alebo zrušiť účet pri porušení podmienok.</p>

        <h2 style={h}>10. Zodpovednosť</h2>
        <p style={s}>TicklyDo nezodpovedá za nepriame škody, stratu dát ani ušlý zisk. Naša zodpovednosť je obmedzená na sumu ktorú ste zaplatili za službu.</p>

        <h2 style={h}>11. Rozhodné právo</h2>
        <p style={s}>Tieto podmienky sa riadia právom Slovenskej republiky.</p>

        <h2 style={h}>12. Zmeny podmienok</h2>
        <p style={s}>O zmenách vás budeme informovať emailom alebo v aplikácii aspoň 14 dní vopred.</p>

        <h2 style={h}>13. Kontakt</h2>
        <p style={s}>support@ticklydo.com</p>
      </div>
    </div>
  );
}