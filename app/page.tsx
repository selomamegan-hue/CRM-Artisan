import Image from "next/image";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: "500" });

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F1ECE2]">
      <Image src="/bonfil-logo.png" alt="Bonfil" width={96} height={111} priority />
      <h1
        className={`${fraunces.className} text-5xl tracking-tight text-[#22303A]`}
      >
        Bonfil
      </h1>
    </div>
  );
}
