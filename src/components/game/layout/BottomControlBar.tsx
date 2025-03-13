const BottomControlBar = () => {
  return (
    <div className="border-t border-border p-2 flex justify-between items-center">
      <div>
        <p className="text-xs font-['Press_Start_2P'] text-blue-800">
          ANYTHING IN YOUR POCKETS?
        </p>
      </div>
      <div>
        <p className="text-xs font-['Press_Start_2P']">
          A game by <a href="https://twitter.com/jeshuamaxey" className=" text-blue-800 underline">Jeshua Maxey</a>
        </p>
      </div>
    </div>
  );
}

export default BottomControlBar;