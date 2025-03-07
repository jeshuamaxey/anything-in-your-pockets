const LabelProgressBar = ({progress, color}: {progress: number, color: string}) => {
  const bgColor = color === 'green' ? 'bg-green-500' : 'bg-blue-500';
  
  return (
    <>
      <div className="w-8 bg-gray-200 rounded-full h-1.5">
        <div 
            className={`${bgColor} h-1.5 rounded-full`} 
            style={{width: `${Math.floor(progress || 0)}%`}}
            >
        </div>
      </div>
      <span className="w-8">{Math.floor(progress || 0)}%</span>
    </>
  );
};

export default LabelProgressBar;