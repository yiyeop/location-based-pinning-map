import axios from 'axios';
import { FC, useEffect, useRef } from 'react';
import tw from 'twin.macro';
import { db } from 'utils/firebase';
import { query, collection, addDoc, doc, getDocs, setDoc, orderBy, startAt, endAt } from 'firebase/firestore';
import { debounce } from 'lodash';

const geofire = require('geofire-common');

const MAP_ROOT_CONTAINER_ID = 'map-root-container';

const testCoords = [
  {
    _lat: 37.564497,
    _lng: 126.9792787,
    // _lat: 37.5645,
    // _lng: 126.9795,
  },
  {
    _lat: 37.5647521,
    _lng: 126.9791714,
  },
  {
    _lat: 37.5646649,
    _lng: 126.9794584,
  },
];

const centerPoint = {
  _lat: 37.562442,
  _lng: 126.977025,
};

// 좌표로 주소 검색
const searchCoordinateToAddress = (latlng) => {
  const naver = window.naver;

  return new Promise((resolve, reject) => {
    try {
      naver.maps.Service.reverseGeocode(
        {
          coords: latlng,
          orders: [
            naver.maps.Service.OrderType.ADDR,
            naver.maps.Service.OrderType.ROAD_ADDR,
            naver.maps.Service.OrderType.LEGAL_CODE,
            naver.maps.Service.OrderType.ADM_CODE,
          ].join(','),
        },
        (status, response) => {
          if (status === naver.maps.Service.Status.ERROR) {
            console.log(status, response);
            reject('ReverseGeocode Error, Please check latlng');
          }
          resolve(response.v2);
        }
      );
    } catch (error) {
      console.log(error);
      reject('Error');
    }
  });
};

type BuildingRequest = {
  confmKey: string;
  admCd: string; // 행정 구역 코드
  rnMgtSn: string; // 도로명 코드
  udrtYn: '0' | '1'; // 지하여부 0: 지상, 1: 지하
  buldMnnm: string; // 건물 본번
  buldSlno: string; // 건물 부번
  resultType: 'json' | 'xml';
};

const getBuildingNumber = (data: BuildingRequest) => {
  return axios({
    url: `https://www.juso.go.kr/addrlink/addrCoordApiJsonp.do`,
    method: 'GET',
    params: data,
  }).then((res) => {
    const length = res?.data.length;
    const json = JSON.parse(res?.data.substring(1, length - 1));
    return json?.results?.juso;
  });
};

const MainContainer: FC = () => {
  const mapRef = useRef();

  const addTest = async () => {
    try {
      console.log('addtest');
      const docRef = await addDoc(collection(db, 'users'), {
        first: 'Ada',
        last: 'Lovelace',
        born: 1815,
      });
      console.log('Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  };

  const getRadius = () => {
    const map = mapRef.current;
    const bounds = map.getBounds();

    const polyline = new naver.maps.Polyline({
      map: map,
      path: [new naver.maps.LatLng(map.getCenter()), new naver.maps.LatLng(bounds._ne)],
      strokeOpacity: 1,
    });
    const distance = polyline.getDistance();
    polyline.onRemove();
    return distance;
  };

  const circleRef = useRef();
  const markers = useRef();

  const loadPins = async () => {
    const map = mapRef.current;
    const naver = window.naver;

    const $center = map.getCenter();

    const center = [Number($center._lat), Number($center._lng)];
    const radiusInM = parseInt(getRadius() - 800);

    if (circleRef.current) {
      circleRef.current.onRemove();
    }

    const circle = new naver.maps.Circle({
      map: map,
      center: new naver.maps.LatLng(...center),
      radius: radiusInM,
      fillColor: 'cyan',
      fillOpacity: 0.1,
    });

    circleRef.current = circle;

    const bounds = geofire.geohashQueryBounds(center, radiusInM);

    let result = [];
    for (const b of bounds) {
      const q = query(collection(db, 'pins'), orderBy('point.geohash'), startAt(b[0]), endAt(b[1]));

      const querySnapshot = await getDocs(q);

      try {
        querySnapshot.forEach((doc) => {
          result.push(doc.data());
        });
      } catch (error) {
        console.log(error);
      }
    }

    result = result.filter((item) => {
      const { lat, lng } = item.point;
      const distanceInKm = geofire.distanceBetween([Number(lat), Number(lng)], center);
      const distanceInM = distanceInKm * 1000;

      return distanceInM <= radiusInM;
    });

    markers.current?.forEach((marker) => marker?.onRemove());

    let loopMarkers = [];
    result.forEach((item) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(item.point.lat, item.point.lng),
        clickable: true,
        map,
        zIndex: 100,
      });
      loopMarkers.push(marker);
    });

    markers.current = loopMarkers;
  };

  useEffect(() => {
    const naver = window.naver;

    // addTest();

    // set map
    const map = new naver.maps.Map(MAP_ROOT_CONTAINER_ID);
    mapRef.current = map;

    loadPins();

    const mapClickEvent = async (e) => {
      // const res = await searchCoordinateToAddress(e.latlng);
      // // console.log(res);

      // let results = {};
      // res.results.forEach(({ name, ...rest }) => {
      //   results[name] = { ...rest };
      // });
      // const { addr, roadaddr, legalcode } = results;

      // console.log(results);

      // if (!roadaddr?.land) return console.log('도로명주소없음');
      // const data = {
      //   confmKey: `U01TX0FVVEgyMDIxMDczMDA5NTE0MTExMTQ3MDA=`,
      //   admCd: roadaddr.code.id,
      //   rnMgtSn: roadaddr.land.addition2.value,
      //   udrtYn: '0',
      //   buldMnnm: roadaddr.land.number1,
      //   buldSlno: roadaddr.land.number2 || '0',
      //   resultType: 'json',
      // };
      // const building = await getBuildingNumber(data);
      // console.log({ building }); // bdMgtSn

      // if (building?.length > 0) {
      //   proj4.defs[
      //     'EPSG:5179'
      //   ] = `+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs`;

      //   const grs80 = proj4.Proj(proj4.defs['EPSG:5179']);
      //   const wgs84 = proj4.Proj(proj4.defs['EPSG:4326']);

      //   const entPoint = proj4.Point(Number(building[0].entX), Number(building[0].entY));

      //   const coord = proj4.transform(grs80, wgs84, entPoint);
      //   console.log('변환된 좌표', coord);

      //   new naver.maps.Marker({
      //     position: new naver.maps.LatLng(coord.y, coord.x),
      //     clickable: true,
      //     map,
      //     zIndex: 100,
      //   });
      // }

      const { x, y } = e.coord;
      const url = `https://map.seoul.go.kr/smgis/apps/geocoding.do`;

      console.log('origin', e.coord);

      const params = {
        cmd: 'getReverseGeocoding',
        key: '5a9e3f209e3047b484a2600fe048a8b8',
        address_type: 'S',
        coord_x: x,
        coord_y: y,
        req_lang: 'KOR',
        res_lang: 'KOR',
      };

      const { body, head } = await axios
        .get(url, {
          params,
        })
        .then((res) => res.data);

      const [lng, lat] = head.point.split(',');
      const geohash = geofire.geohashForLocation([Number(lat), Number(lng)]);

      const data = {
        code: body[0].code,
        point: {
          geohash,
          lat,
          lng,
        },
        NEW_ADDR: head.NEW_ADDR,
        LEGAL_ADDR: head.LEGAL_ADDR,
      };
      console.log(data);

      // const docRef = doc(db, 'pins', data.code);

      // setDoc(docRef, {
      //   ...data,
      //   message: ['test'],
      // });

      new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        clickable: true,
        map,
        zIndex: 100,
      });
    };

    map.addListener('click', mapClickEvent);

    const boundsChangeEvent = debounce((e) => {
      console.log('bounds_changed');
      // loadPins();
    }, 500);

    map.addListener('bounds_changed', boundsChangeEvent);

    // map.setCenter(new naver.maps.LatLng(centerPoint._lat, centerPoint._lng));
    // map.setZoom(20);

    // const markers = testCoords.map((coord) => {
    //   return new naver.maps.Marker({
    //     position: new naver.maps.LatLng(coord._lat.toFixed(5), coord._lng.toFixed(4)),
    //     clickable: true,
    //     map,
    //     zIndex: 100,
    //   });
    // });
  }, []);

  return (
    <div css={tw`w-full h-full`} id={MAP_ROOT_CONTAINER_ID}>
      test
    </div>
  );
};

export default MainContainer;
