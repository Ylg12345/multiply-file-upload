

self.importScripts('/spark-md5.min.js');
self.onmessage = (e) => {
  const { chunkList } = e.data;
  const spark = new self.SparkMD5.ArrayBuffer();
  const fileReader = new FileReader();
  let curChunkIndex = 0;
  let percentage = 0;

  function loadNext(curChunkIndex) {
    fileReader.readAsArrayBuffer(chunkList[curChunkIndex].chunk)
  }

  fileReader.onload = (e) => {
    spark.append(e.target.result);
    curChunkIndex++

    if(curChunkIndex < chunkList.length) {
      percentage += (100 / chunkList.length);
      self.postMessage({
        percentage
      });
      loadNext(curChunkIndex);
    } else {
      self.postMessage({
        hash: spark.end(),
        percentage: 100,
      });
      self.close();
    }
  }

  loadNext(curChunkIndex);
}