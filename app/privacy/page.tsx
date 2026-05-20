"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  const s = {color:"rgba(200,190,255,0.8)",fontFamily:"sans-serif",lineHeight:"1.7"};
  const h = {color:"#f0eeff",fontFamily:"sans-serif",marginTop:"32px",marginBottom:"8px"};
  return (
    <div style={{minHeight:"100vh",background:"#07070f",padding:"40px 20px"}}>
      <div style={{maxWidth:"800px",margin:"0 auto"}}>
        <button onClick={() => router.push("/")} style={{background:"none",border:"none",color:"#c084fc",cursor:"pointer",fontFamily:"sans-serif",marginBottom:"24px"}}>← Späť</button>
        <h1 style={{...h,fontSize:"28px"}}>Zásady ochrany osobných údajov</h1>
        <p style={s}>Posledná aktualizácia: 20. 5. 2026</p>

        <h2 style={h}>1. Prevádzkovateľ údajov</h2>
        <p style={s}>TicklyDo, Slovenská republika. Email: support@ticklydo.com. TicklyDo je prevádzkovateľom osobných údajov používateľov a návštevníkov stránky. TicklyDo je spracovateľom obsahu ktorý používatelia ukladajú do aplikácie (tasky, nápady, kalendár).</p>

        <h2 style={h}>2. Aké údaje zbierame</h2>
        <p style={s}><strong style={{color:"#f0eeff"}}>Údaje ktoré nám poskytnete:</strong> Email, meno a heslo pri registrácii. Pri registrácii cez Google získavame email, meno a profilovú fotku.</p>
        <p style={s}><strong style={{color:"#f0eeff"}}>Údaje generované používaním:</strong> IP adresa, typ zariadenia, prehliadač, aktivita v aplikácii, logy prihlásení.</p>
        <p style={s}><strong style={{color:"#f0eeff"}}>Obsah ktorý vytvoríte:</strong> Tasky, nápady, kalendárne záznamy a iný obsah uložený vo vašom účte.</p>

        <h2 style={h}>3. Právny základ spracovania</h2>
        <p style={s}>Vaše údaje spracúvame na základe: plnenia zmluvy (poskytovanie služby), vášho súhlasu (pri registrácii), a oprávneného záujmu (bezpečnosť a zlepšovanie služby).</p>

        <h2 style={h}>4. Ako údaje používame</h2>
        <p style={s}>Údaje používame výlučne na: vytvorenie a správu vášho účtu, poskytovanie funkcií aplikácie, zasielanie dôležitých oznámení o službe, zabezpečenie a ochranu pred zneužitím.</p>
        <p style={s}>Vaše osobné údaje <strong style={{color:"#f0eeff"}}>nepredávame</strong> tretím stranám.</p>

        <h2 style={h}>5. Kde sú údaje uložené</h2>
        <p style={s}>Údaje sú uložené v Google Firebase (Google LLC). Dáta môžu byť spracované v EÚ alebo USA. Google LLC je certifikovaná podľa štandardov EU-US Data Privacy Framework.</p>

        <h2 style={h}>6. Doba uchovávania</h2>
        <p style={s}>Vaše údaje uchovávame po dobu existencie vášho účtu. Po vymazaní účtu sú údaje odstránené do 30 dní.</p>

        <h2 style={h}>7. Vaše práva (GDPR)</h2>
        <p style={s}>Máte právo na: prístup k svojim údajom, opravu nesprávnych údajov, vymazanie údajov (právo na zabudnutie), obmedzenie spracovania, prenosnosť údajov, námietku proti spracovaniu.</p>
        <p style={s}>Pre uplatnenie práv nás kontaktujte na support@ticklydo.com. Máte tiež právo podať sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).</p>

        <h2 style={h}>8. Súbory cookie</h2>
        <p style={s}>Používame len nevyhnutné cookies pre fungovanie prihlásenia a autentifikácie. Nepoužívame reklamné ani sledovacie cookies tretích strán.</p>

        <h2 style={h}>9. Bezpečnosť</h2>
        <p style={s}>Vaše údaje chránime pomocou šifrovania HTTPS, Firebase Authentication a bezpečnostných pravidiel databázy. Pri podozrení na porušenie ochrany údajov vás budeme informovať do 72 hodín.</p>

        <h2 style={h}>10. Zmeny zásad</h2>
        <p style={s}>O zmenách vás budeme informovať emailom alebo oznámením v aplikácii aspoň 14 dní vopred.</p>

        <h2 style={h}>11. Kontakt</h2>
        <p style={s}>support@ticklydo.com</p>
      </div>
    </div>
  );
}