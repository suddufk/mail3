<template>
  <div class="box" v-if="email">
    <div class="header-actions">
      <Icon class="icon" icon="material-symbols-light:arrow-back-ios-new" width="20" height="20" @click="handleBack"/>
      <Icon v-perm="'email:delete'" class="icon" icon="uiw:delete" width="16" height="16" @click="handleDelete"/>
      <span class="star" v-if="emailStore.contentData.showStar">
        <Icon class="icon" @click="changeStar" v-if="email.isStar" icon="fluent-color:star-16" width="20" height="20"/>
        <Icon class="icon" @click="changeStar" v-else icon="solar:star-line-duotone" width="18" height="18"/>
      </span>
      <Icon class="icon" v-if="emailStore.contentData.showReply" v-perm="'email:send'"  @click="openReply" icon="la:reply" width="21" height="21" />
      <Icon class="icon" v-if="emailStore.contentData.showReply" v-perm="'email:send'"  @click="openForward" icon="iconoir:arrow-up-right" width="20" height="20" />
    </div>
    <el-scrollbar class="scrollbar">
      <div class="container">
        <div class="email-title">
          {{ email.subject }}
        </div>
        <div class="content">
          <div class="email-info">
            <div>
              <div class="send"><span class="send-source">{{$t('from')}}</span>
                <div class="send-name">
                  <span class="send-name-title">{{ email.name }}</span>
                  <span><{{ email.sendEmail }}></span>
                </div>
              </div>
              <div class="receive"><span class="source">{{$t('recipient')}}</span><span class="receive-email">{{  formateReceive(email.recipient) }}</span></div>
              <div class="date">
                <div>{{ formatDetailDate(email.createTime) }}</div>
              </div>
            </div>
            <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
          </div>
          <el-scrollbar class="htm-scrollbar" :class="email.attList.length === 0 ? 'bottom-distance' : ''">
            <ShadowHtml class="shadow-html" :html="formatImage(email.content)" v-if="email.content" />
            <pre v-else class="email-text" >{{email.text}}</pre>
          </el-scrollbar>
          <div class="att" v-if="email.attList.length > 0">
            <div class="att-title">
              <span>{{$t('attachments')}}</span>
              <span>{{$t('attCount',{total: email.attList.length})}}</span>
            </div>
            <div class="att-box">

              <div class="att-item" v-for="att in email.attList" :key="att.attId">
                <div class="att-icon" @click="showImage(att.key)">
                  <Icon v-bind="getIconByName(att.filename)" />
                </div>
                <div class="att-name" @click="showImage(att.key)">
                  {{ att.filename }}
                </div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="opt-icon att-icon">
                  <Icon v-if="isImage(att.filename)" icon="hugeicons:view" width="22" height="22" @click="showImage(att.key)"/>
                  <a :href="cvtR2Url(att.key)" download>
                    <Icon icon="system-uicons:push-down" width="22" height="22"/>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="showPreview = false"
    />
  </div>
</template>
<script setup>
import ShadowHtml from '@/components/shadow-html/index.vue'
import {reactive, ref, watch, onMounted, onUnmounted} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead} from "@/request/email.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url,toOssDomain} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const router = useRouter()
const email = emailStore.contentData.email
const showPreview = ref(false)
const srcList = reactive([])

// 防御：若 email 数据为空，重定向回收件箱
if (!email) {
  router.replace({name: 'email'})
}

const { t } = useI18n()
watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

onMounted(() => {
  if (email && emailStore.contentData.showUnread && email.unread === EmailUnreadEnum.UNREAD) {
    email.unread = EmailUnreadEnum.READ;
    emailRead([email.emailId]).catch(() => {
      // 标记已读失败时回退乐观更新
      email.unread = EmailUnreadEnum.UNREAD;
    });
  }
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
})

function openReply() {
  uiStore.writerRef.openReply(email)
}

function openForward() {
  uiStore.writerRef.openForward(email)
}

function toMessage(message) {
  return  message ? JSON.parse(message).message : '';
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return  content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function showImage(key) {
  if (!isImage(key)) return;
  const url = cvtR2Url(key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.isStar) {
    email.isStar = 0;
    starCancel(email.emailId).then(() => {
      email.isStar = 0;
      emailStore.cancelStarEmailId = email.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.emailId])
    }).catch((e) => {
      console.error(e)
      email.isStar = 1;
    })
  } else {
    email.isStar = 1;
    starAdd(email.emailId).then(() => {
      email.isStar = 1;
      emailStore.addStarEmailId = email.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email)
    }).catch((e) => {
      console.error(e)
      email.isStar = 0;
    })
  }
}

const handleBack = () => {
  // 使用显式路由而非 router.back()，避免历史栈浅时离开应用
  const fallbackRoute = emailStore.contentData.delType === 'physics' ? {name: 'all-email'} : {name: 'email'}
  router.push(fallbackRoute)
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.emailId]
      })
    } else  {

      allEmailDelete(email.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.emailId]
      })
    }

    const fallbackRoute = emailStore.contentData.delType === 'physics' ? {name: 'all-email'} : {name: 'email'}
    router.push(fallbackRoute)
  })
}
</script>
<style scoped lang="scss">
.box {
  height: 100%;
  overflow: hidden;
  background: var(--linear-panel);
}

.header-actions {
  min-height: 42px;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: var(--header-actions-border);
  font-size: 18px;
  background: var(--linear-panel);
  .star {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
  }
  .icon {
    cursor: pointer;
    color: var(--linear-text-muted);
    width: 28px;
    height: 28px;
    padding: 5px;
    border-radius: 6px;
    box-sizing: border-box;
    transition: color 140ms ease, background 140ms ease;
  }

  .icon:hover {
    color: var(--el-text-color-primary);
    background: var(--linear-hover);
  }
}


.scrollbar {
  height: calc(100% - 42px);
  width: 100%;
}

.container {
  font-size: 14px;
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 32px 48px;
  @media (max-width: 1023px) {
    padding: 20px 16px 36px;
  }

  .email-title {
    font-size: 24px;
    line-height: 1.25;
    font-weight: 680;
    margin-bottom: 18px;
    letter-spacing: 0;
  }

  .htm-scrollbar {
  }

  .content {
    display: flex;
    flex-direction: column;

    .att {
      margin-top: 28px;
      margin-bottom: 30px;
      border: 1px solid var(--linear-border);
      padding: 12px;
      border-radius: 8px;
      width: min(660px, 100%);
      background: var(--linear-panel-muted);
      .att-box {
        min-width: 0;
        max-width: none;
        display: grid;
        gap: 6px;
        grid-template-rows: 1fr;
      }

      .att-title {
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        color: var(--linear-text-muted);
        font-size: 12px;
        span:first-child {
          font-weight: 650;
          color: var(--el-text-color-primary);
        }
      }

      .att-item {
        cursor: pointer;
        div {
          align-self: center;
        }
        background: var(--linear-panel);
        border: 1px solid var(--linear-border-subtle);
        padding: 7px 9px;
        border-radius: 6px;
        align-self: start;
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 8px;
        transition: border-color 140ms ease, background 140ms ease;
        .att-icon {
          display: grid;
        }

        .att-size {
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .att-name {
          margin-left: 8px;
          margin-right: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .att-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .opt-icon {
          padding-left: 10px;
          color: var(--secondary-text-color);
          align-items: center;
          display: flex;
          gap: 8px;
          cursor: pointer;
          a {
            color: var(--secondary-text-color);
            align-items: center;
            display: flex;
          }
        }
      }

      .att-item:hover {
        border-color: var(--linear-border);
        background: var(--linear-hover);
      }
    }

    .email-info {

      border: 1px solid var(--linear-border);
      border-radius: 8px;
      margin-bottom: 22px;
      padding: 12px 14px;
      background: var(--linear-panel-muted);
      @media (max-width: 1024px) {
        margin-bottom: 15px;
      }
      .date {
        color: var(--regular-text-color);
        margin-bottom: 4px;
        font-size: 12px;
      }

      .email-msg {
        max-width: 400px;
        width: fit-content;
        margin-bottom: 15px;
      }

      .send {
        display: flex;
        margin-bottom: 5px;

        .send-name {
          color: var(--regular-text-color);
          display: flex;
          flex-wrap: wrap;
        }

        .send-name-title {
          padding-right: 5px;
        }
      }

      .receive {
        margin-bottom: 5px;
        display: flex;
        .receive-email {
          max-width: 700px;
          word-break: break-word;
        }
        span:nth-child(2) {
          color: var(--regular-text-color);
        }
      }

      .send-source {
        white-space: nowrap;
        font-weight: 650;
        padding-right: 12px;
        color: var(--linear-text-muted);
        font-size: 12px;
      }

      .source {
        white-space: nowrap;
        font-weight: 650;
        padding-right: 12px;
        color: var(--linear-text-muted);
        font-size: 12px;
      }
    }
  }
}

.shadow-html::after  {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--message-block-color); /* 半透明黑色蒙层 */
  pointer-events: none; /* 不影响点击 */
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  color: var(--el-text-color-primary);
  line-height: 1.65;
}

.bottom-distance {
  margin-bottom: 30px;
}

.box {
  background: var(--cm-color-window);
  display: grid;
  grid-template-rows: 76px minmax(0, 1fr) auto;
}

.header-actions {
  min-height: 76px;
  padding: 0 40px 0 46px;
  gap: 26px;
  box-shadow: none;
  background: var(--cm-color-window);

  .icon {
    width: 24px;
    height: 24px;
    padding: 2px;
    color: var(--cm-color-text);
    border-radius: 7px;
  }
}

.scrollbar {
  height: 100%;
}

.container {
  max-width: none;
  padding: 20px 48px 24px 38px;

  .email-title {
    margin: 0 0 26px;
    padding-left: 0;
    font-size: 24px;
    font-weight: 760;
    color: var(--cm-color-text);
  }

  .content {
    min-height: 710px;
    border-radius: 16px;
    border: 1px solid var(--cm-color-border);
    background: var(--cm-color-panel);
    box-shadow: var(--cm-shadow-card);
    padding: 28px 30px;

    @media (max-width: 767px) {
      min-height: auto;
      border-radius: var(--cm-radius-md);
      padding: 22px 18px;
    }

    .email-info {
      border: 0;
      border-bottom: 1px solid var(--cm-color-border-soft);
      border-radius: 0;
      margin-bottom: 26px;
      padding: 0 0 24px;
      background: transparent;

      .date {
        margin-top: 6px;
        margin-bottom: 0;
        font-size: 15px;
      }

      .send,
      .receive {
        margin-bottom: 6px;
      }

      .send-source,
      .source {
        color: var(--cm-color-text-muted);
        font-size: 15px;
      }
    }
  }
}

</style>
