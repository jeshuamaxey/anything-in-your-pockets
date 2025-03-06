import Game from "@/components/Game";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold mb-2 font-['Press_Start_2P'] text-blue-800">AIRPORT SECURITY</h1>
      <h2 className="text-xl mb-8 font-['Press_Start_2P'] text-blue-600">SIMULATOR</h2>
      <Game />
      <div className="mt-8 p-4 bg-blue-100 rounded-lg border border-blue-300 max-w-2xl">
        <h3 className="font-bold text-blue-800 mb-2">How to Play:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Manage the security checkpoint efficiently</li>
          <li>Click directly on passengers or the security checkpoint to process them</li>
          <li>Watch for suspicious items (red indicators)</li>
          <li>Keep an eye on your KPI stats in the top-left corner</li>
        </ul>
      </div>
    </div>
  );
}
