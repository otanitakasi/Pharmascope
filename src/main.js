"use strict";

// マジックナンバー設定
const MESH = 15;
const TIMER_INTERVAL = 100;
const FALL_SPEED = 6;
const FORWARD_UNIT = 30 * 1000;
// シンボル設定
const NYURYOKU = Symbol();
const PRESCRIPT_WAIT = Symbol();
const PRESCRIPT = Symbol();
const CHOUZAI_KANSA = Symbol();
const HUKUYAKU_WAIT = Symbol();
const HUKUYAKU = Symbol();
const ZANCHI = Symbol();
// グローバル変数
let gHomeFlag;
let gTime = new Date();
let gCalendarTime = new Date();
let gOpenStamp;
let gDiffTime;
let gStartTime;
let gStopTime;
let gResumeTime;
let gStopIntervalTime;
let gTimerStopFlag;
let gSpeedController;
let gTImeFowardBack;
let gHeight;
let gDescriptionMode;
let gPatients = [];
let gNyuryoku = [];
let gPrescriptWait = [];
let gPrescript = [];
let gChozaiKansa = [];
let gHukuyakuWait = [];
let gHukuyaku = [];
let gZanchi = [];
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
const nyuryokuCanvas = document.getElementById("nyuryoku");             //入力ライン
const prescriptWaitCanvas = document.getElementById("prescriptWait");   //処方鑑査待ちライン
const prescriptCanvas = document.getElementById("prescript");           //処方鑑査ライン
const chouzaiKansaCanvas = document.getElementById("chouzaiKansa");     //調剤鑑査ライン
const hukuyakuWaitCanvas = document.getElementById("hukuyakuWait");     //服薬指導待ちライン
const hukuyakuCanvas = document.getElementById("hukuyaku");             //服薬指導ライン
const zanchiCanvas = document.getElementById("zanchi");                 //残置ライン
// コンテキストの取得
const gNyuryokuCtx = nyuryokuCanvas.getContext("2d");                   //入力ライン
const gPrescriptWaitCtx = prescriptWaitCanvas.getContext("2d");         //処方鑑査待ちライン
const gPrescriptCtx = prescriptCanvas.getContext("2d");                 //処方鑑査ライン
const gChouzaiKansaCtx = chouzaiKansaCanvas.getContext("2d");           //調剤鑑査ライン
const gHukuyakuWaitCtx = hukuyakuWaitCanvas.getContext("2d");           //服薬指導待ちライン
const gHukuyakuCtx = hukuyakuCanvas.getContext("2d");                   //服薬指導ライン
const gZanchiCtx = zanchiCanvas.getContext("2d");                       //残置ライン
// canvasの高さを設定
const gCanvasElement = document.getElementById('nyuryoku-div');
gHeight = gCanvasElement.clientHeight;
nyuryokuCanvas.height = gHeight;
prescriptWaitCanvas.height = gHeight;
prescriptCanvas.height = gHeight;
chouzaiKansaCanvas.height = gHeight;
hukuyakuWaitCanvas.height = gHeight;
hukuyakuCanvas.height = gHeight;
zanchiCanvas.height = gHeight;

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
  constructor(_ctx) {
    this.ctx = _ctx;
    this.x = 0;
    this.y = 100;
    this.replayImg = new Image();
    this.replayImg.src = './img/play_center.png';
    this.pauseImg = new Image();
    this.pauseImg.src = './img/pause_center.png';
    this.cntMax = 25;
    this.dispCnt = this.cntMax;
  }

  dispCntInit() {
    this.dispCnt = 0;
  }
  
  draw() {
    if (this.dispCnt < this.cntMax) {
      this.img = (gTimerStopFlag === 0) ? this.replayImg : this.pauseImg;
      this.x = this.cntMax - this.dispCnt;
      this.y = 100 + this.cntMax - this.dispCnt;
      this.ctx.drawImage(this.img, this.x, this.y, this.dispCnt*3, this.dispCnt*3);
      this.dispCnt++;
    }
  }
};
const gReplayCtrl = new replayControllerCenterDisp(gChouzaiKansaCtx);

///////////////////////////////////////////////////////
// 患者クラス
class Patient {
  constructor(_data) {
    this.id = _data.id;
    // 入力
    this.inputPerson = _data.input_person;                  // 入力担当者
    this.timeIS = new Date(Date.parse(_data.input_start));  // 入力開始時間
    this.timeIE = new Date(Date.parse(_data.input_end));    // 入力終了時間
    // 処方鑑査
    this.prescriptPerson = _data.prescript_person;              // 処方鑑査担当者
    this.timePS = new Date(Date.parse(_data.prescript_start));  // 処方鑑査開始時間
    this.timePE = new Date(Date.parse(_data.prescript_end));    // 処方鑑査終了時間
    // 調剤
    this.chouzaiPerson = _data.chouzai_person;                // 調剤担当者
    this.timeCS = new Date(Date.parse(_data.chouzai_start));  // 調剤開始時間
    this.timeCE = new Date(Date.parse(_data.chouzai_end));    // 調剤終了時間
    // 鑑査
    this.kansaPerson = _data.kansa_person;                  // 鑑査担当者
    this.timeKS = new Date(Date.parse(_data.kansa_start));  // 鑑査開始時間
    this.timeKE = new Date(Date.parse(_data.kansa_end));    // 鑑査終了時間
    // 服薬指導
    this.hukuyakuPerson = _data.hukuyaku_person;              //服薬指導担当者
    this.timeHS = new Date(Date.parse(_data.hukuyaku_start)); // 服薬指導開始時間
    this.timeHE = new Date(Date.parse(_data.hukuyaku_end));   // 服薬指導終了時間
    // 残置
    this.zanchiPerson = _data.zanchi_person;                  //残置担当者
    this.timeZS = new Date(Date.parse(_data.zanchi_start));   // 残置登録開始時間

    this.stage = null;    //入力～残置
    this.mY = 0;
    this.width = null;
    this.colorId = null;
    this.radius = 5;
  }

  // 矩形描画処理
  draw(ctx, stage , y) {
    this.width = gCanvasElement.clientWidth;    // 現在の幅を取得（ウィンドウ幅により可変）

    // ステージ変更時には、上から落ちてくるアニメーションにするための設定
    if (this.stage !== stage) {
      this.mY = 0;
      this.stage = stage;
    }
    const mYDist = gHeight - MESH - (y * (MESH + 5)); 
    this.mY = (this.mY < mYDist) ? this.mY+FALL_SPEED : mYDist;

    // 入力開始からの経過時間により色を設定する
    const passTime = (gTime.getTime() - this.timeIS.getTime())/60000;   // 経過時間（分）
    if (gDescriptionMode === 'TIME_DISP') {
      this.colorId = (passTime < 10) ? 0 : (passTime < 20) ? 1 : (passTime < 30) ? 2
                   : (passTime < 40) ? 3 : 4;
    } else {
      switch(stage) {
        case NYURYOKU: 
          for (let i=0; i<gAnalysisiData.AllMember.length; i++) {
            if (gAnalysisiData.AllMember[i] === this.inputPerson) {
              this.colorId = i;
            }
          }
          break;
        case PRESCRIPT_WAIT: this.colorId = 100;
        break;
        case PRESCRIPT:
          for (let i=0; i<gAnalysisiData.AllMember.length; i++) {
            if (gAnalysisiData.AllMember[i] === this.prescriptPerson) {
              this.colorId = i;
            }
          }
          break;
        case CHOUZAI_KANSA :
          for (let i=0; i<gAnalysisiData.AllMember.length; i++) {
            if (gAnalysisiData.AllMember[i] === this.chouzaiPerson) {
              this.colorId = i;
            }
          }
          break;
        case HUKUYAKU_WAIT:  this.colorId = 100;
          break;
        case HUKUYAKU: 
          for (let i=0; i<gAnalysisiData.AllMember.length; i++) {
            if (gAnalysisiData.AllMember[i] === this.hukuyakuPerson) {
              this.colorId = i;
            }
          }
          break;
        case ZANCHI:  this.colorId = 200; 
          break;
        default: this.colorId = 100; break;
      }
    }
    
    ctx.fillStyle = (this.colorId === 100) ? 'rgba(255, 255, 255, 0.5)' :
                    (this.colorId === 200) ? '#A7A7A7' :
        (gDescriptionMode === 'TIME_DISP') ? gTimeColorPallets[this.colorId]
                                           : gPersonColorPallets[this.colorId];

    roundedRect(ctx, 2, this.mY, this.width-3, MESH, this.radius);  // 矩形表示
    textDisp(ctx, this.id, this.width/2, this.mY+MESH-2);           // 処方箋番号表示
  }
}


///////////////////////////////////////////////////////
// 描画処理
function Animationdraw() {
  const apoNowTemp = [];

  let cnt = 0;
  // 入力ラインの描画
  gNyuryokuCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gNyuryokuCtx.fillRect(0, 0, nyuryokuCanvas.width, nyuryokuCanvas.height)
  gNyuryoku =   gPatients.filter(function(patient) {
    return ((gTime.getTime() >= patient.timeIS.getTime()) && (gTime.getTime() < patient.timeIE.getTime() ))
  });
  for (let block of gNyuryoku)  block.draw(gNyuryokuCtx, NYURYOKU, cnt++);

  // 処方鑑査待ちラインの描画
  cnt = 0;
  gPrescriptWaitCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gPrescriptWaitCtx.fillRect(0, 0, prescriptWaitCanvas.width, prescriptWaitCanvas.height)
  gPrescriptWait =   gPatients.filter(function(patient) {
    return ((gTime.getTime() >= patient.timeIE.getTime()) && (gTime.getTime() < patient.timePS.getTime() ))
  });
  for (let block of gPrescriptWait)  block.draw(gPrescriptWaitCtx, PRESCRIPT_WAIT, cnt++);

  // 処方鑑査ラインの描画
  cnt = 0;
  gPrescriptCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gPrescriptCtx.fillRect(0, 0, prescriptCanvas.width, prescriptCanvas.height)
  gPrescript =   gPatients.filter(function(patient) {
    return ((gTime.getTime() >= patient.timePS.getTime()) && (gTime.getTime() < patient.timePE.getTime() ))
  });
  for (let block of gPrescript) {
    block.draw(gPrescriptCtx, PRESCRIPT, cnt++);
    apoNowTemp.push(block.prescriptPerson);
  }

  // 調剤監査ラインの描画
  cnt = 0;
  gChouzaiKansaCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gChouzaiKansaCtx.fillRect(0, 0, gCanvasElement.clientWidth, chouzaiKansaCanvas.height)
  gChozaiKansa =   gPatients.filter(function(patient) {
    return ((gTime.getTime() >= patient.timePE.getTime()) && (gTime.getTime() < patient.timeKE.getTime() ))
  });
  for (let block of gChozaiKansa)  {
    block.draw(gChouzaiKansaCtx, CHOUZAI_KANSA, cnt++);
    let waitTime = (block.timeHS.getTime() - block.timeIS.getTime()) / 1000 / 60;
    if (waitTime < 90) {
      apoNowTemp.push(block.chouzaiPerson);
      apoNowTemp.push(block.kansaPerson);
    }
  }

  // 服薬指導待ちラインの描画
  cnt = 0;
  gHukuyakuWaitCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gHukuyakuWaitCtx.fillRect(0, 0, hukuyakuWaitCanvas.width, hukuyakuWaitCanvas.height)
  gHukuyakuWait =   gPatients.filter(function(patient) {
    return ((gTime.getTime() >= patient.timeKE.getTime())
          && (gTime.getTime() < patient.timeHS.getTime())
          && ((patient.zanchiPerson.length === 0)||(gTime.getTime() < patient.timeZS.getTime()))
          )
  });
  for (let block of gHukuyakuWait) block.draw(gHukuyakuWaitCtx, HUKUYAKU_WAIT, cnt++);

  // 服薬指導ラインの描画
  cnt = 0;
  gHukuyakuCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gHukuyakuCtx.fillRect(0, 0, hukuyakuCanvas.width, hukuyakuCanvas.height)
  gHukuyaku =   gPatients.filter(function(patient) {
    return ((gTime.getTime() >= patient.timeHS.getTime()) && (gTime.getTime() <= patient.timeHE.getTime() ))
  });
  for (let block of gHukuyaku) {
    block.draw(gHukuyakuCtx, HUKUYAKU, cnt++);
    apoNowTemp.push(block.hukuyakuPerson);
  }

  // 残置ラインの描画
  cnt = 0;
  gZanchiCtx.fillStyle = 'rgba(21, 21, 30, 0.3)';
  gZanchiCtx.fillRect(0, 0, zanchiCanvas.width, zanchiCanvas.height)
  gZanchi =   gPatients.filter(function(patient) {
    return ((patient.zanchiPerson.length !== 0)
          &&(gTime.getTime() >= patient.timeZS.getTime())
          &&(gTime.getTime() < patient.timeHS.getTime())
          )
  });
  for (let block of gZanchi) block.draw(gZanchiCtx, ZANCHI, cnt++);

  //　稼働薬剤師数の計算
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
    // 8:00を基準とした入力開始時間
    timeISFromStart = (patient.timeIS.getTime() - gOpenStamp) / 1000 / 60;

    //　入力開始から服薬指導開始までを待ち時間と定義（残置、90分以上を除く）
    if (patient.zanchiPerson.length === 0) {
      waitTime = (patient.timeHS.getTime() - patient.timeIS.getTime()) / 1000 / 60;
      chouzaiKansaTime = (patient.timeKE.getTime() - patient.timeCS.getTime()) / 1000 / 60;
      if (waitTime < 90) {
        waitTimeSum += waitTime;                // 待ち時間
        chouzaiKansaTimeSum += chouzaiKansaTime;// 調剤・鑑査時間
        waitTimeCnt++;

        // １時間毎の待ち時間をカウントアップ（平均の計算はループが抜けた後）
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
    inputTime = (patient.timeIE.getTime() - patient.timeIS.getTime()) / 1000 / 60;
    inputTimeSum += inputTime;
    // 処方鑑査時間
    preKansaTime = (patient.timePE.getTime() - patient.timePS.getTime()) / 1000 / 60;
    preKansaTimeSum += preKansaTime;
    // 服薬指導時間
    hukuyakuTime = (patient.timeHE.getTime() - patient.timeHS.getTime()) / 1000 / 60;
    hukuyakuTimeSum += hukuyakuTime;
    // 出勤薬剤師
    apoMemberTemp.push(patient.prescriptPerson);
    apoMemberTemp.push(patient.chouzaiPerson);
    apoMemberTemp.push(patient.kansaPerson);
    apoMemberTemp.push(patient.hukuyakuPerson);
    // 出勤医療事務
    opeMemberTemp.push(patient.inputPerson);
    // 残置数
    if (patient.zanchiPerson.length !== 0) {
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
          // backgroundColor: "rgba(75, 192, 192, 0.5)",
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
          { id: "y-axis-2",                 // Y軸右)
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
  gDiffTime = 0;
  gStopTime = gResumeTime = gStopIntervalTime = gTImeFowardBack = 0;
  gSpeedController = 60;  // 60倍速で表示

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
  gOpenStamp = gTime.getTime(); // 開始時刻(8:00)のタイムスタンプ取得
  
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
  gStartTime = performance.now();
  
  dataAnalysis();
  descriptonUpdate();
  chartDraw();
  dispUpdate();
}

///////////////////////////////////////////////////////
// FPS　Controller
function dispUpdate() {
  
  if (gTimerStopFlag == 0) {
    // 開始時間からの経過時間を開始タイムスタンプに加算
    gDiffTime = performance.now() - gStartTime - gStopIntervalTime + (gTImeFowardBack*FORWARD_UNIT);
    gTime.setTime(gOpenStamp + gDiffTime * gSpeedController);
    
    
    gReplayCtrl.draw();
    clock();
    Animationdraw(); 
    requestAnimationFrame(dispUpdate);
  } else {
    console.log("Stop");
    // gReplayCtrl.draw();
    // requestAnimationFrame(dispUpdate);
    
  }

  gDescriptionMode = gModeSelecter.value;
}

///////////////////////////////////////////////////////
// リプレイコントローラー
function replayController() {
  gTimerStopFlag = 0;
  gResumeTime = performance.now(); // 再開した時間
  gStopIntervalTime += gResumeTime - gStopTime; // 一時停止した時間をカウント
  dispUpdate();
}
function pauseController() {
  gTimerStopFlag = 1;
  gStopTime = performance.now(); //ストップした時間
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
      gReplayCtrl.dispCntInit();
    }
    // Push Arrow key -> 早送り、巻き戻し
    if (e.key === 'ArrowRight') {
      gTImeFowardBack++;
      if (gTimerStopFlag === 1) {
        dispUpdate();
      }
    } else if (e.key === 'ArrowLeft') {
      gTImeFowardBack--;
    }
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
  gTImeFowardBack++;
});
gFastForwardBtn.addEventListener("mouseup", (e) => {
  gFastForwardBtn.style.transform = "scale(1)";
});
// 巻き戻しボタン処理
gBackForwardBtn.addEventListener("mousedown", (e) => {
  gBackForwardBtn.style.transform = "scale(1.3)";
  gTImeFowardBack--;
});
gBackForwardBtn.addEventListener("mouseup", (e) => {
  gBackForwardBtn.style.transform = "scale(1)";
});

// アニメーションエリアの再生コントロール
chouzaiKansaCanvas.addEventListener("click", (e)=> {
  if (gTimerStopFlag === 1) {
    replayController();
  } else {
    pauseController();
  }
  gReplayCtrl.dispCntInit();
})

//　表示モード切替
gModeSelecter.addEventListener("change", (e) => {
  descriptonUpdate();
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
  ctx.font = '17px "Noto Sans JP"';
  ctx.fillStyle = "#daf6ff";
  // ctx.fillStyle = '#15151e';
  ctx.fillText(str, offsetX-3, offsetY);
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

///////////////////////////////////////////////////////
// 画面中央での再生コントロール
function replayControllerTest() {
  const img = new Image();
  img.onload = function() {
    gChouzaiKansaCtx.drawImage(img, 5, 100, 20, 20);
  };
  img.src = './img/play_center.png';

}

