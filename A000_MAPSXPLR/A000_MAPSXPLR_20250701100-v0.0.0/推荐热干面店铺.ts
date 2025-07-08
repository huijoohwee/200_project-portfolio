import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {Icon, Style} from 'ol/style';

// 在推荐结果处理逻辑中添加
const iconFeature = new Feature({
  geometry: new Point([114.3055, 30.5928]),
  name: '推荐热干面店铺'
});

const iconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    src: 'https://docs.maptiler.com/openlayers/default-marker/marker-icon.png'
  })
});

iconFeature.setStyle(iconStyle);