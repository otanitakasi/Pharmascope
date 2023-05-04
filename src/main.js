"use strict";

// マジックナンバー設定
const MESH = 15;
const FALL_SPEED = 6;
const FORWARD_UNIT = 30 * 60 * 1000;    // 30分進める
const BACK_UNIT = 30 * 60 * 1000;       // 30分戻す
const WATCH_SPEED = 60;                 // 60倍速
// シンボル設定
const NYURYOKU = Symbol();
const PRESCRIPT_WAIT = Symbol();
const PRESCRIPT = Symbol();
const CHOUZAI = Symbol();
const KANSA = Symbol();
const CHOUZAI_KANSA = Symbol();
const HUKUYAKU_WAIT = Symbol();
const HUKUYAKU = Symbol();
const ZANCHI = Symbol();
// グローバル変数
let gHomeFlag;
let gTime = new Date();
let gCalendarTime = new Date();
let gOpenTime;
let gBaseTime;
let gDiffTime;
let gStartTime;
let gTimerStopFlag;
let gSpeedController;
let gHeight;
let gDescriptionMode;
let gPatients = [];
let gAnalysisiData = new Object();
let gPatientsNumTimeZone = Array(12).fill(0);
let gWaitTimeAveTimeZone = Array(12).fill(0);

const gTimeColorPallets = [ 'rgba(57, 210, 248, 1)',
                            'rgba(4, 255, 11, 1)',
                            'rgba(254, 220, 64, 1)',
                            'rgba(215, 98, 252, 1)',
                            'rgba(247, 93, 139, 1)'
];
const gPersonColorPallets = ['#493177','#0B4F9D', '#35E2D8', '#F5F525', '#ED7234',
                              '#1E3083', '#2674F9', '#F8D42B', '#74C726', '#C9373C',
                             '#84BEBF', '#E6E098', '#EABD57', '#E1449D', '#853491'];

///////////////////////////////////////////////////////
// canvasの設定
const gCanvas = new Map([
  [NYURYOKU, document.getElementById("nyuryoku")],
  [PRESCRIPT_WAIT, document.getElementById("prescriptWait")],
  [PRESCRIPT, document.getElementById("prescript")],
  [CHOUZAI_KANSA, document.getElementById("chouzaiKansa")],
  [HUKUYAKU_WAIT, document.getElementById("hukuyakuWait")],
  [HUKUYAKU, document.getElementById("hukuyaku")],
  [ZANCHI, document.getElementById("zanchi")],
]);
// コンテキストの取得
const gCtx = new Map([
  [NYURYOKU, gCanvas.get(NYURYOKU).getContext("2d")],
  [PRESCRIPT_WAIT, gCanvas.get(PRESCRIPT_WAIT).getContext("2d")],
  [PRESCRIPT, gCanvas.get(PRESCRIPT).getContext("2d")],
  [CHOUZAI_KANSA, gCanvas.get(CHOUZAI_KANSA).getContext("2d")],
  [HUKUYAKU_WAIT, gCanvas.get(HUKUYAKU_WAIT).getContext("2d")],
  [HUKUYAKU, gCanvas.get(HUKUYAKU).getContext("2d")],
  [ZANCHI, gCanvas.get(ZANCHI).getContext("2d")]
]);
// canvasの高さを設定
const gCanvasElement = document.getElementById('nyuryoku-div');
gHeight = gCanvasElement.clientHeight;
for (let line of gCanvas.keys()) {
  gCanvas.get(line).height = gHeight;
}

////////////////////////////////////////////////////////
// その他要素取得
const gModeSelecter = document.getElementById('mode-select');
const gPlayBtn = document.getElementById('play-btn');
const gPauseBtn = document.getElementById('pause-btn');
const gBackForwardBtn = document.getElementById('backforward-btn');
const gFastForwardBtn = document.getElementById('fastforward-btn');
const gInitBtn = document.getElementById('initial-btn');
const gCalendar = document.getElementById('calendar');


////////////////////////////////////////////////////////
// 画面中央の再生・停止表示コントローラークラス
class replayControllerCenterDisp {
  constructor() {
    this.ctx;
    this.x = 0;
    this.y = gHeight/3;
    this.replayImg = new Image();
    this.replayImg.src = './img/play_center.png';
    this.pauseImg = new Image();
    this.pauseImg.src = './img/pause_center.png';
    this.forwardImg = new Image();
    this.forwardImg.src = './img/forward_center.png';
    this.backwardImg = new Image();
    this.backwardImg.src = './img/backward_center.png';
    this.cntMax = 40;
    this.dispCnt = this.cntMax;
    this.flag = 0;
  }

  dispCntInit() {
    this.dispCnt = 0;
  }
  
  draw() {
    if (this.dispCnt < this.cntMax) {
      this.img = (this.flag === 0) ? this.replayImg :
                 (this.flag === 1) ? this.pauseImg :
                 (this.flag === 2) ? this.forwardImg : this.backwardImg;
      this.ctx = (this.flag === 0) ? gCtx.get(CHOUZAI_KANSA) : 
                 (this.flag === 1) ? gCtx.get(CHOUZAI_KANSA) :
                 (this.flag === 2) ? gCtx.get(HUKUYAKU) : gCtx.get(PRESCRIPT_WAIT);
      this.x = this.cntMax - this.dispCnt;
      this.y = gHeight/3 + this.cntMax - this.dispCnt;
      this.ctx.drawImage(this.img, this.x, this.y, this.dispCnt*2, this.dispCnt*2);
      this.dispCnt++;
    }
  }
};
const gReplayCtrl = new replayControllerCenterDisp();

///////////////////////////////////////////////////////
// 患者クラス
class Patient {
  constructor(_data) {
    this.id = _data.id;
    this.person = new Map([
      [NYURYOKU, _data.input_person],
      [PRESCRIPT, _data.prescript_person],
      [CHOUZAI, _data.chouzai_person],
      [KANSA, _data.kansa_person],
      [HUKUYAKU, _data.hukuyaku_person],
      [ZANCHI, _data.zanchi_person]
    ]);
    this.time = new Map([
      [NYURYOKU, [new Date(Date.parse(_data.input_start)), new Date(Date.parse(_data.input_end))]],
      [PRESCRIPT_WAIT, [new Date(Date.parse(_data.input_end)), new Date(Date.parse(_data.prescript_start))]],
      [PRESCRIPT, [new Date(Date.parse(_data.prescript_start)), new Date(Date.parse(_data.prescript_end))]],
      [CHOUZAI, [new Date(Date.parse(_data.chouzai_start)), new Date(Date.parse(_data.chouzai_end))]],
      [KANSA, [new Date(Date.parse(_data.kansa_start)), new Date(Date.parse(_data.kansa_end))]],
      [CHOUZAI_KANSA, [new Date(Date.parse(_data.prescript_end)), new Date(Date.parse(_data.kansa_end))]],// 処方鑑査終了から鑑査終了まで
      [HUKUYAKU_WAIT, [new Date(Date.parse(_data.kansa_end)), 
        (this.person.get(ZANCHI).length===0)  ? new Date(Date.parse(_data.hukuyaku_start))
                                              : new Date(Date.parse(_data.zanchi_start))]],               // 残置にする場合は、残置開始まで
      [HUKUYAKU, [new Date(Date.parse(_data.hukuyaku_start)), new Date(Date.parse(_data.hukuyaku_end))]],
      [ZANCHI, [new Date(Date.parse(_data.zanchi_start)), new Date(Date.parse(_data.hukuyaku_start))]]    // 残置開始から服薬指導開始まで
    ]);

    this.mY = new Map([
      [NYURYOKU,0],[PRESCRIPT_WAIT,0],[PRESCRIPT,0],
      [CHOUZAI_KANSA,0],[HUKUYAKU_WAIT,0],[HUKUYAKU,0], [ZANCHI,0]
    ]);
    this.width = null;
    this.colorId = new Array();
  }

  // 矩形描画処理
  draw(ctx, stage , y) {
    this.width = gCanvasElement.clientWidth;    // 現在の幅を取得(ウィンドウ幅により可変)

    // 高さの計算
    // 初期値を０に設定されているため、初めて表示される際は上から落下してくるように描画 
    const mYDist = gHeight - MESH - (y * (MESH + 5));
    if (mYDist < 0 ) return;                      // ライン上限を超える場合は描画処理は終了
    const mYValue = this.mY.get(stage);
    const mYSet = (mYValue < mYDist) ? mYValue+FALL_SPEED : mYDist; 
    for (let key of this.mY.keys()) {
      if (key === stage) {
        this.mY.set(key, mYSet);
      } else {
        // 先服薬指導では服薬指導と他ラインが同時に表示される場合があるため、
        // 服薬指導の時間内はY座標の初期化は行わない
        if ((gTime.getTime() >= this.time.get(HUKUYAKU)[0].getTime()) &&
            (gTime.getTime() <= this.time.get(HUKUYAKU)[1].getTime())) {
        } else {
          // 上記以外の場合は、該当ライン以外を初期値の0に設定
          this.mY.set(key, 0);
        }
      }
    }

    // カラーセレクション
    // 待ち時間モード　or 担当者モード
    // 待ち時間モード：入力開始からの経過時間により色を設定する
    const passTime = (gTime.getTime() - this.time.get(NYURYOKU)[0].getTime())/60000;   // 経過時間（分）
    if (gDescriptionMode === 'TIME_DISP') {
      this.colorId[0] = (passTime < 10) ? 0 : (passTime < 20) ? 1 : (passTime < 30) ? 2
                      : (passTime < 40) ? 3 : 4;
      ctx.fillStyle = gTimeColorPallets[this.colorId[0]];
      ctx.fillRect(this.width/30, this.mY.get(stage), this.width*3/8, MESH);
      ctx.fillRect(this.width*5/8, this.mY.get(stage), this.width*3/8-this.width/30, MESH);
      textDisp(ctx, this.id, this.width/2-this.width/15, this.mY.get(stage)+MESH-MESH/10);
    } else {
      for (let i=0; i<gAnalysisiData.AllMember.length; i++) {
        if (stage === CHOUZAI_KANSA) {
          if (gAnalysisiData.AllMember[i] === this.person.get(CHOUZAI)) {
            this.colorId[0] = i;
          }
          if (gAnalysisiData.AllMember[i] === this.person.get(KANSA)) {
            this.colorId[1] = i;
          }
        } else {
          if (gAnalysisiData.AllMember[i] === this.person.get(stage)) {
            this.colorId[0] = i;
          }
        }
      }
      if (stage === CHOUZAI_KANSA) {
        ctx.fillStyle = gPersonColorPallets[this.colorId[0]];
        ctx.fillRect(this.width/30, this.mY.get(stage), this.width*3/8, MESH);
        ctx.fillStyle = gPersonColorPallets[this.colorId[1]];
        ctx.fillRect(this.width*5/8, this.mY.get(stage), this.width*3/8-this.width/30, MESH);
        textDisp(ctx, this.id, this.width/2-this.width/15, this.mY.get(stage)+MESH-MESH/10);
      } else if ((stage===PRESCRIPT_WAIT)||(stage===HUKUYAKU_WAIT)||(stage===ZANCHI)) {
        ctx.strokeStyle = "#daf6ff";
        ctx.strokeRect(this.width/30, this.mY.get(stage), this.width-this.width/10, MESH);  // 待ち状態では塗りつぶしはなし
        textDisp(ctx, this.id, this.width/2-this.width/15, this.mY.get(stage)+MESH-MESH/10);
      } else {
        ctx.fillStyle = gPersonColorPallets[this.colorId[0]];
        ctx.fillRect(this.width/30, this.mY.get(stage), this.width*3/8, MESH);
        ctx.fillRect(this.width*5/8, this.mY.get(stage), this.width*3/8-this.width/30, MESH);
        textDisp(ctx, this.id, this.width/2-this.width/15, this.mY.get(stage)+MESH-MESH/10);
      }
    }
  }
}


///////////////////////////////////////////////////////
// 描画処理
function Animationdraw() {
  const apoNowTemp = [];
  let select = [];

  for (let line of gCtx.keys()) {
    // 残像が残るように描画をクリアする
    gCtx.get(line).fillStyle = 'rgba(21, 21, 30, 0.3)';
    gCtx.get(line).fillRect(0, 0, gCanvas.get(line).width, gHeight);

    //各ラインの描画
    select =   gPatients.filter(function(patient) {
      return ((gTime.getTime() >= patient.time.get(line)[0].getTime()) &&
              (gTime.getTime() < patient.time.get(line)[1].getTime() ))
    });

    let cnt = 0;
    for (let block of select) {
      block.draw(gCtx.get(line), line, cnt++);

      // 稼働薬剤師数のカウント
      if (line === CHOUZAI_KANSA) {
        let waitTime = (block.time.get(HUKUYAKU)[0] - block.time.get(NYURYOKU)[0]) / 1000 / 60;
        if (waitTime < 90) {  // 待ち時間90以上は除く
          apoNowTemp.push(block.person.get(CHOUZAI));
          apoNowTemp.push(block.person.get(KANSA));
        }
      } else if ((line===PRESCRIPT)||(line===HUKUYAKU)) {
        apoNowTemp.push(block.person.get(line));
      }
    }
  }

  //　稼働薬剤師数の計算(重複を除く)
  const apoMemberNow = Array.from(new Set(apoNowTemp))  // 配列内の重複を削除
  gAnalysisiData.apoMemberNow = apoMemberNow.length;
  document.getElementById('apo-member-now').innerHTML = `${gAnalysisiData.apoMemberNow} 人`;
}

///////////////////////////////////////////////////////
// データ分析
function dataAnalysis() {
  
  let waitTime;
  let waitTimeSum = 0;
  let waitTimeCnt = 0;
  let inputTime;
  let inputTimeSum = 0;
  let preKansaTime;
  let preKansaTimeSum = 0;
  let chouzaiKansaTime;
  let chouzaiKansaTimeSum = 0;
  let hukuyakuTime;
  let hukuyakuTimeSum = 0;
  let zanchiCnt = 0;
  let timeISFromStart;
  const apoMemberTemp = [];
  const opeMemberTemp = [];
  
  // 受付処方箋枚数
  gAnalysisiData.priscriptCnt = gPatients.length;
  document.getElementById('priscript-cnt').innerHTML = `${gAnalysisiData.priscriptCnt} 枚`;
  // タイムゾーンデータの初期化
  gPatientsNumTimeZone = gPatientsNumTimeZone.map(function() {return 0;});
  gWaitTimeAveTimeZone = gWaitTimeAveTimeZone.map(function() {return 0;});

  for (let patient of gPatients) {
    // 入力開始の8:00からの経過時間
    timeISFromStart = (patient.time.get(NYURYOKU)[0].getTime() - gOpenTime) / 1000 / 60;

    //　入力開始から服薬指導開始までを待ち時間と定義（残置、90分以上を除く）
    if (patient.person.get(ZANCHI).length === 0) {
      waitTime = (patient.time.get(HUKUYAKU)[0].getTime() - patient.time.get(NYURYOKU)[0].getTime()) / 1000 / 60;
      chouzaiKansaTime = (patient.time.get(KANSA)[1].getTime() - patient.time.get(CHOUZAI)[0].getTime()) / 1000 / 60;
      if (waitTime < 90) {
        waitTimeSum += waitTime;                // 待ち時間加算
        chouzaiKansaTimeSum += chouzaiKansaTime;// 調剤・鑑査時間
        waitTimeCnt++;

        // １時間毎の待ち時間をカウント（平均の計算はループが抜けた後）
        gWaitTimeAveTimeZone = gWaitTimeAveTimeZone.map(function(value, index) {
            if ((timeISFromStart >= (60*index)) && (timeISFromStart < (60*(index+1)))) {
              return value + waitTime;
            } else {
              return value;
            }
          }
        );
      }
    }

    // １時間毎の処方箋枚数をカウント
    gPatientsNumTimeZone = gPatientsNumTimeZone.map(function(value, index) {
        if ((timeISFromStart >= (60*index)) && (timeISFromStart < (60*(index+1)))) {
          return value+1;
        } else {
          return value;
        }
      }
    );

  
    // 入力時間
    inputTime = (patient.time.get(NYURYOKU)[1].getTime() - patient.time.get(NYURYOKU)[0].getTime()) / 1000 / 60;
    inputTimeSum += inputTime;
    // 処方鑑査時間
    preKansaTime = (patient.time.get(PRESCRIPT)[1].getTime() - patient.time.get(PRESCRIPT)[0].getTime()) / 1000 / 60;
    preKansaTimeSum += preKansaTime;
    // 服薬指導時間
    hukuyakuTime = (patient.time.get(HUKUYAKU)[1].getTime() - patient.time.get(HUKUYAKU)[0].getTime()) / 1000 / 60;
    hukuyakuTimeSum += hukuyakuTime;
    // 出勤薬剤師
    apoMemberTemp.push(patient.person.get(PRESCRIPT));
    apoMemberTemp.push(patient.person.get(CHOUZAI));
    apoMemberTemp.push(patient.person.get(KANSA));
    apoMemberTemp.push(patient.person.get(HUKUYAKU));
    // 出勤医療事務
    opeMemberTemp.push(patient.person.get(NYURYOKU));
    // 残置数
    if (patient.person.get(ZANCHI).length !== 0) {
      zanchiCnt++;
    }
  }

  //　平均待ち時間
  gAnalysisiData.waitTimeAve = (waitTimeSum / waitTimeCnt).toFixed(1);
  document.getElementById('wait-time-ave').innerHTML = `${gAnalysisiData.waitTimeAve} 分`;
  //  平均入力時間
  gAnalysisiData.inputTimeAve = (inputTimeSum / gPatients.length).toFixed(1);
  document.getElementById('input-time').innerHTML = `${gAnalysisiData.inputTimeAve} 分`;
  //  平均処方鑑査時間
  gAnalysisiData.preKansaTimeAve = (preKansaTimeSum / gPatients.length).toFixed(1);
  document.getElementById('pri-kansa-time').innerHTML = `${gAnalysisiData.preKansaTimeAve} 分`;
  //  平均調剤・鑑査時間
  gAnalysisiData.chouzaiKansaTimeAve = (chouzaiKansaTimeSum / waitTimeCnt).toFixed(1);
  document.getElementById('chouzai-kansa-time').innerHTML = `${gAnalysisiData.chouzaiKansaTimeAve} 分`;
  //  平均服薬指導時間
  gAnalysisiData.hukuyakuTimeAve = (hukuyakuTimeSum / gPatients.length).toFixed(1);
  document.getElementById('hukuyaku-time').innerHTML = `${gAnalysisiData.hukuyakuTimeAve} 分`;
  //  出勤薬剤師数
  gAnalysisiData.apoMember = Array.from(new Set(apoMemberTemp));  // 配列内の重複を削除
  gAnalysisiData.apoMemberNum = gAnalysisiData.apoMember.length;
  document.getElementById('apo-member-all').innerHTML = `${gAnalysisiData.apoMemberNum} 人`;
  //  出勤オペ人数
  gAnalysisiData.opeMember = Array.from(new Set(opeMemberTemp));  // 配列内の重複を削除
  gAnalysisiData.opeMemberNum = gAnalysisiData.opeMember.length;
  //  出勤スタッフ
  gAnalysisiData.AllMember = Array.from(new Set(apoMemberTemp.concat(opeMemberTemp)));
  // 残置率
  gAnalysisiData.zanchiRatio = Math.round((zanchiCnt / gPatients.length)*100);
  document.getElementById('zanchi-ratio').innerHTML = `${gAnalysisiData.zanchiRatio} %`;
  // １時間ごとの平均待ち時間を計算
  gWaitTimeAveTimeZone = gWaitTimeAveTimeZone.map(
    function(value, index) { return value / gPatientsNumTimeZone[index]}
  );
}

///////////////////////////////////////////////////////
// 表示説明領域
function descriptonUpdate() {
  gDescriptionMode = gModeSelecter.value;

  const ul = document.getElementById("description-list");
  const li = [];

  while(ul.firstChild){
    ul.removeChild(ul.firstChild);
  }

  if (gDescriptionMode === 'TIME_DISP') {     // 待ち時間表示モード
    const textTimes = ['0-10 min', '10-20 min', '20-30 min', '30-40 min', '40 min over'];
    for (let i=0; i<textTimes.length; i++) {
      li[i] = document.createElement('li');
      li[i].textContent = textTimes[i];
      li[i].style.backgroundColor = gTimeColorPallets[i];
      ul.appendChild(li[i]);
    }
  } else {                                    // 担当者表示モード
    for (let i=0; i<gAnalysisiData.AllMember.length; i++) {
      li[i] = document.createElement('li');
      li[i].textContent = gAnalysisiData.AllMember[i];
      li[i].style.backgroundColor = gPersonColorPallets[i];
      ul.appendChild(li[i]);
    }
  }
}

///////////////////////////////////////////////////////
// 分析チャート(chart.jsを使用)　
// 処方箋枚数と待ち時間を表示
function chartDraw() {
  const chartCtx = document.getElementById("myChart").getContext("2d");
  const chart = new Chart(chartCtx, {
    type: "bar",
    data: {
      labels: [
        "8時","9時","10時","11時","12時","13時",
        "14時","15時","16時","17時","18時","19時",
      ],
      datasets: [
        {
          type: "line",
          label: "待ち時間(Ave)",
          // data: [12, 19, 3, 5, 2, 3, 90, 14, 23, 30, 18, 40],
          data: gWaitTimeAveTimeZone,
          borderColor: "rgb(75, 192, 192)",
          yAxisID: "y-axis-1"
        },
        {
          type: "bar",
          label: "処方箋枚数",
          // data: [12, 19, 3, 5, 2, 3, 10, 14, 23, 30, 18, 30],
          data: gPatientsNumTimeZone,
          borderColor: "rgb(153, 102, 255)",
          backgroundColor: "rgba(203, 102, 255, 0.7)",
          yAxisID: "y-axis-2"
        },
      ],
    },
    options: {
      tooltips: {
        mode: 'nearest',
        intersect: false,
      },
      responsive: true,
      legend: {
        display: true,
        labels: {
          fontColor: "#daf6ff"
        }
      },
      scales: {
        xAxes: [                            // Ｘ軸設定
          {
            ticks: {                        // 目盛り
              fontColor: "#daf6ff",         // 目盛りの色
              fontSize: 14                  // フォントサイズ
            }
          }
        ],
        yAxes: [                            // Y軸設定
          { id: "y-axis-1",                 // Y軸(左)
            type: "linear",
            position: "left",

            gridLines: {                    // 補助線
              color: "#daf6ff",             // 補助線の色
            },

            ticks: {                        // 目盛設定
              fontColor: "#daf6ff",
              suggesteMax: 90,
              suggestMin: 0,
              stepSize: 10,
              callback: function(value, index, values){
                return  value +  '分'
              }
            },
          }, 
          { id: "y-axis-2",                 // Y軸(右)
            type: "linear",
            position: "right",
            ticks: {                        // 目盛設定
              fontColor: "#daf6ff",
              suggesteMax: 300,
              suggestMin: 0,
              stepSize: 10,
              callback: function(value, index, values){
                return  value +  '枚'
              }
            },
          }
        ],
      }
    }
  });
};

///////////////////////////////////////////////////////
//　ページ読み込み時の処理
window.onload = function () {
  gHomeFlag = 1;
  gTimerStopFlag = 1;
  gSpeedController = WATCH_SPEED;  // 60倍速で表示
};

///////////////////////////////////////////////////////
// 初期化処理
function init() {
  // 開始時刻設定(デファルトは8時)
  gTime = gCalendarTime;
  gTime.setFullYear(2023);          //　デモ時日付固定
  gTime.setMonth(2);                //　デモ時日付固定
  gTime.setDate(13);                //　デモ時日付固定
  gTime.setHours(8);
  gTime.setMinutes(0);
  gTime.setSeconds(0);
  gTime.setMilliseconds(0);
  gOpenTime = gTime.getTime(); // 開始時刻(8:00)のタイムスタンプ取得
  
  // JSONデータファイル読み込み
  // サーバーから読み込む
  // let url = 'http://localhost:8080/data.json';
  // fetch(url)
  // .then( response => response.json())
  // .then( data => console.log(data));

  // HTMLべた書き（スタンドアロンモード）
  for (let data of gJSON) {
    gPatients.push(new Patient(data));
  }

  gTimerStopFlag = 0;
  gDiffTime = 0;
  gBaseTime = gOpenTime;
  gStartTime = performance.now();
  
  dataAnalysis();
  descriptonUpdate();
  chartDraw();
  dispUpdate();
}

///////////////////////////////////////////////////////
// FPS　Controller
function dispUpdate() {
  // 経過時間の計算
  gDiffTime = (gTimerStopFlag === 1) ? 0 : (performance.now() - gStartTime);
  gTime.setTime(gBaseTime + gDiffTime * gSpeedController);
  
  // 描画更新処理
  gReplayCtrl.draw();
  clock();
  Animationdraw(); 
  requestAnimationFrame(dispUpdate);
}

///////////////////////////////////////////////////////
// リプレイコントローラー
function replayController() {
  gTimerStopFlag = 0;
  gStartTime = performance.now(); // 再開時の時間を開始時間に再設定
  gReplayCtrl.flag = 0;
}
function pauseController() {
  gTimerStopFlag = 1;
  gBaseTime = gTime.getTime(); //ストップ時の経過時間
  gReplayCtrl.flag = 1;
}
function backforwardController(forwardFlag) {
  if (forwardFlag === 1) {
    gBaseTime = gTime.getTime() + FORWARD_UNIT; //現時刻に加算して時間を進める
    gReplayCtrl.flag = 2;
  } else {
    gBaseTime = gTime.getTime() - BACK_UNIT; //現時刻に減算して時間を戻す
    gReplayCtrl.flag = 3;
  }
  gStartTime = performance.now(); // 経過時間を初期化
}

///////////////////////////////////////////////////////
// イベントリスナー
document.addEventListener("keydown", (e) => {
  if (gHomeFlag === 0) {
    // Push 'Space' key -> 描画一時停止 or 再開
    if (e.key === " ") {
      if (gTimerStopFlag === 0) {
        pauseController();
      } else {
        replayController();
      }
      e.preventDefault();
    }
    // Push Arrow key -> 早送り、巻き戻し
    if (e.key === 'ArrowRight') {
      backforwardController(1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      backforwardController(0);
      e.preventDefault();
    }

    gReplayCtrl.dispCntInit();
  }
});

// 再生スタートボタン処理
gPlayBtn.addEventListener("mousedown", (e) => {
  if (gTimerStopFlag === 1) {
    gPlayBtn.style.transform = "scale(1.3)";
    replayController();
  }
});
gPlayBtn.addEventListener("mouseup", (e) => {
  gPlayBtn.style.transform = "scale(1)";
});

// 再生ストップボタン処理
gPauseBtn.addEventListener("mousedown", (e) => {
  if (gTimerStopFlag === 0) {
    gPauseBtn.style.transform = "scale(1.3)";
    pauseController();
  }
});
gPauseBtn.addEventListener("mouseup", (e) => {
  gPauseBtn.style.transform = "scale(1)";
});

// 早送りボタン処理
gFastForwardBtn.addEventListener("mousedown", (e) => {
  gFastForwardBtn.style.transform = "scale(1.3)";
  backforwardController(1);

});
gFastForwardBtn.addEventListener("mouseup", (e) => {
  gFastForwardBtn.style.transform = "scale(1)";
});

// 巻き戻しボタン処理
gBackForwardBtn.addEventListener("mousedown", (e) => {
  gBackForwardBtn.style.transform = "scale(1.3)";
  backforwardController(0);
});
gBackForwardBtn.addEventListener("mouseup", (e) => {
  gBackForwardBtn.style.transform = "scale(1)";
});

// アニメーションエリアの再生コントロール（5つのラインでクリック操作を有効化）
for (let line  of gCanvas.keys()) {
  gCanvas.get(line).addEventListener("click", (e)=> {
    if (gTimerStopFlag === 1) {
      replayController();
    } else {
      pauseController();
    }
    gReplayCtrl.dispCntInit();
  });
}

//　表示モード切替
gModeSelecter.addEventListener("change", (e) => {
  descriptonUpdate();
  gDescriptionMode = gModeSelecter.value;
});

// ホーム画面から分析画面への遷移　
gInitBtn.addEventListener("click", (e) => {
  if (gCalendar.valueAsDate === null) {
    alert("日時を選択してください");
  } else {
    document.getElementById("main-display").style.zIndex = 10;
    document.getElementById("setting-display").style.display = 'none';
    gCalendarTime = gCalendar.valueAsDate;
    gHomeFlag = 0;
    init();
  }
});

/////////////////////////////////////////////////////////////////////////////////////
//    ユーティリティ
/////////////////////////////////////////////////////////////////////////////////////
// 角丸の四角形を描画するためのユーティリティ関数
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.fill();
}

// テキスト描画
// str: 文字列,  offsetX:X座標,  offsetY:Y座標
function textDisp(ctx, str, offsetX, offsetY) {
  ctx.font = '15px "Noto Sans JP"';
  ctx.fillStyle = "#daf6ff";
  ctx.fillText(str, offsetX, offsetY);
}


// カラーグラデーション作成(現在未使用)
function createGradient (ctx, pallets, width, height) {
  const linearGradient = ctx.createLinearGradient(0, 0, width, height);

  switch(num) {
    case 1:
      linearGradient.addColorStop(0, 'rgba(89, 173, 241, 1)');
      linearGradient.addColorStop(0.5, 'rgba(207, 253, 157, 1)');
      linearGradient.addColorStop(1, 'rgba(14, 244, 255, 1)');
      break;
    case 2:
      linearGradient.addColorStop(0, 'rgba(89, 173, 241, 1)');
      linearGradient.addColorStop(1, 'rgba(207, 253, 157, 1)');
      break;
    case 3:
      linearGradient.addColorStop(0.1, 'rgba(247, 166, 12, 1) ');
      linearGradient.addColorStop(1, 'rgba(35, 102, 247, 1)');
      break;
    case 4:
      linearGradient.addColorStop(0, 'rgba(65, 164, 253, 1)');
      linearGradient.addColorStop(1, 'rgba(14, 244, 255, 1)');
      break;
    case 5:
      linearGradient.addColorStop(0, 'rgba(65, 164, 253, 1)');
      linearGradient.addColorStop(1, 'rgba(14, 244, 255, 1)');
      break;
    defalt:
      linearGradient.addColorStop(0, 'rgba(65, 164, 253, 1)');
      linearGradient.addColorStop(1, 'rgba(14, 244, 255, 1)');
      break;    
  }
  ctx.fillStyle = linearGradient;
}

///////////////////////////////////////////////////////
// デジタル時計表示
const clock = () => {
  // 年を取得
  let year = gTime.getFullYear();
  // 月を取得
  let month = gTime.getMonth() + 1;
  // 日を取得
  let date = gTime.getDate();
  // 曜日を取得
  let dayNum = gTime.getDay();
  const weekday = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  let day = weekday[dayNum];
  // 時を取得
  let hour = gTime.getHours();
  // 分を取得
  let min = gTime.getMinutes();
  // 秒を取得
  let sec = gTime.getSeconds();

  // 1桁の場合は0を足して2桁に
  month = month < 10 ? "0" + month : month;
  date = date < 10 ? "0" + date : date;
  hour = hour < 10 ? "0" + hour : hour;
  min = min < 10 ? "0" + min : min;
  sec = sec < 10 ? "0" + sec : sec;

  // 日付・時刻の文字列を作成
  let today = `${year}.${month}.${date} ${day}`;
  //let time = `${hour}:${min}`;
  let time = `${hour}:${min}:${sec}`;

  // 文字列を出力
  document.querySelector(".clock-date").innerText = today;
  document.querySelector(".clock-time").innerText = time;
};

