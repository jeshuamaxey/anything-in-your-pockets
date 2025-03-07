const SecurityLaneZoneHeading = ({
  title,
  nItems,
  capacity
}: {
  title: string;
  nItems: number;
  capacity: number;
}) => {
  return (
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="flex text-xs">{nItems} / {capacity}</p>
    </div>
  )
}

export default SecurityLaneZoneHeading;