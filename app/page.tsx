import Abertura from "@/components/Abertura";
import CartaTaro from "@/components/landing/CartaTaro";
import ComoFunciona from "@/components/landing/ComoFunciona";
import Comunidade from "@/components/landing/Comunidade";
import Duvidas from "@/components/landing/Duvidas";
import OQueE from "@/components/landing/OQueE";
import OQueVem from "@/components/landing/OQueVem";
import Planos from "@/components/landing/Planos";
import PorQueCartas from "@/components/landing/PorQueCartas";
import QuemCriou from "@/components/landing/QuemCriou";
import Rodape from "@/components/landing/Rodape";

export default function Home() {
  return (
    <>
      <Abertura />
      <OQueE />
      <OQueVem />
      <CartaTaro />
      <Comunidade />
      <PorQueCartas />
      <Planos />
      <ComoFunciona />
      <QuemCriou />
      <Duvidas />
      <Rodape />
    </>
  );
}
