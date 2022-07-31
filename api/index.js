const id = 188908
const uri = `https://ootopi-cors-proxy.herokuapp.com/https://www.cycleforhope.sg/user/${id}`

let dom_donation_list = document.getElementById('donation_list')
let dom_donation_list_children = []
let dom_donation_alert = document.createElement('div')
dom_donation_alert.id = 'donation-alert'
dom_donation_alert.classList.toggle('hidden', true)
document.body.appendChild(dom_donation_alert)
let last_update = Date.now()

let dom_alert_list = document.getElementById('alert_list')
let dom_alert_list_children = []
let interval

const dom_donation_alert_name = document.createElement('span')
dom_donation_alert_name.classList.toggle('name', true)
dom_donation_alert.appendChild(dom_donation_alert_name)
const dom_donation_alert_amount_prefix = document.createElement('span')
dom_donation_alert_amount_prefix.classList.toggle('amount_prefix', true)
dom_donation_alert.appendChild(dom_donation_alert_amount_prefix)
const dom_donation_alert_amount = document.createElement('span')
dom_donation_alert_amount.classList.toggle('amount', true)
dom_donation_alert.appendChild(dom_donation_alert_amount)
const dom_donation_alert_msg = document.createElement('span')
dom_donation_alert_msg.classList.toggle('message', true)
dom_donation_alert.appendChild(dom_donation_alert_msg)

dom_donation_list.onclick = e => {
  const entry = announced.find(x => x.id == dom_donation_list[dom_donation_list.selectedIndex].value)
  entry.replay = true
  add_to_trigger_queue(entry)
  dom_donation_list.selectedIndex = -1
}

const donation_alert_sfx = new Audio('./media/default.ogg')
let audio_context

document.addEventListener('click', init)

function init() {
  audio_context = new AudioContext()
  const source = audio_context.createMediaElementSource(donation_alert_sfx)
  source.connect(audio_context.destination)
  document.removeEventListener('click', init)

  document.querySelector('#reset').addEventListener('click', _ => {
    announced = []
    trigger_queue = []
    dom_donation_list.innerHTML = ''
    dom_alert_list_children = []
    dom_alert_list.innerHTML = ''
    triggering = false
    updating = false
    clearTimeout(timeout)
    clearInterval(interval)
    get_data().then(entries => {
      updating = false
      entries.forEach(add_to_donations_list)
    }).then(_ => interval = setInterval(update, 1000)) 
  })

  document.querySelector('#skip').addEventListener('click', skip)
  get_data().then(entries => {
    updating = false
    entries.forEach(add_to_donations_list)
  }).then(_ => interval = setInterval(update, 1000))
}

let announced = []
let trigger_queue = []
let triggering = false
let updating = false
let timeout
let counter = 0
let money_bar = document.getElementById('money_progress')
let money_indicator = document.getElementById('money_indicator')

function add_to_trigger_queue(entry) {
  const old_entry = announced.find(x => x.name == entry.name && x.amount == entry.amount && x.message == entry.message)
  if(old_entry && !old_entry.replay) return
  entry.replay = false

  if(old_entry && old_entry.replay) {
    old_entry.replay = false
    entry = old_entry
  }

  if(old_entry == undefined) add_to_donations_list(entry)

  trigger_queue.push(entry)

  const el = document.createElement('option')
  el.value = entry.id
  el.textContent = `${entry.name}: ${entry.amount}`
  dom_alert_list.appendChild(el)
  dom_alert_list_children.push(el)

  if(!triggering) trigger()
}

function add_to_donations_list(entry) {
  const e = document.createElement('option')
  e.value = counter
  entry.id = counter
  announced.push(entry)
  counter ++
  dom_donation_list.prepend(e)
  dom_donation_list_children.push(e)
  e.textContent = `${entry.name}: ${entry.amount}`
}

const get_data = _ => fetch(uri).then(r => r.text())
  .then(raw => {
    const e = new DOMParser()
    const doc = e.parseFromString(raw, 'text/html')
    const cards = doc.querySelectorAll('div.w-full.rounded-md.border.py-2.border-gray-400')
    
    const money_goal = doc.querySelector('.fpoppins_medium.text-gray-500.text-lg.flex.justify-center.items-center.my-1').childNodes[0].textContent.trim().split(' ')[0].replaceAll(/[,$]/ig, '')

    const goals = doc.querySelectorAll('.w-full.flex.flex-col.items-baseline.mb-3')
    if(goals) {
      const money_current = goals[0].childNodes[1].textContent.match(/\$(\d+),(\d+)/)[0].replaceAll(/[$,]/ig, '')
      const distance_current = goals[1].childNodes[1].textContent.trim().split(' ')[0]
      const distance_goal = goals[1].childNodes[1].textContent.trim().split(' ')[3]
      console.log(`$${money_current}/$${money_goal} ${distance_current}km/${distance_goal}km`)
      money_bar.style = `width: ${Math.floor(Math.min(money_goal, money_current)/money_goal)*100}`
      money_indicator.textContent = `$${money_current} of $${money_goal} raised`
    }
    
    return Array.from(cards).map(card => ({
        name: card.querySelector('p:nth-of-type(1)').textContent,
        amount: card.querySelector('p:nth-of-type(2) span').textContent,
        message: card.querySelector('p:nth-of-type(3)').textContent,
    }))
  })

function update() {
  if(updating) return
  last_update = Date.now()
  updating = true
  console.log('updating', Date.now())

  return get_data().then(entries => {
    updating = false
    console.log('stopped updating', Date.now())
    entries.forEach(add_to_trigger_queue)
  }).then(trigger).catch(e => update)
}

function skip() {
  clearTimeout(timeout)
  const id = dom_alert_list.selectedIndex
  dom_alert_list_children.shift().remove()
  dom_donation_alert.classList.toggle('pulse', false)
  dom_donation_alert.classList.toggle('hidden', true)
  triggering = false
  trigger()
}

function trigger() {
  if(triggering || trigger_queue.length == 0) {
    if(!updating && Date.now() - last_update > 1000) {
      clearTimeout(timeout)
      update()
    } else timeout = setTimeout(trigger, 1000)
    return
  }

  triggering = true
  const entry = trigger_queue.shift()
  dom_donation_list.selectedIndex = entry.id
  dom_donation_alert_name.textContent = entry.name
  dom_donation_alert_amount_prefix.textContent = ' has donated '
  dom_donation_alert_amount.textContent = entry.amount.replace('SGD ', 'SGD$')
  dom_donation_alert_msg.textContent = entry.message
  
  donation_alert_sfx.volume = 0.2
  donation_alert_sfx.pause()
  donation_alert_sfx.currentTime = 0
  donation_alert_sfx.play()

  const new_node = dom_donation_alert.cloneNode()
  dom_donation_alert.parentNode.replaceChild(new_node, dom_donation_alert)
  dom_donation_alert = new_node
  dom_donation_alert.appendChild(dom_donation_alert_name)
  dom_donation_alert.appendChild(dom_donation_alert_amount_prefix)
  dom_donation_alert.appendChild(dom_donation_alert_amount)
  dom_donation_alert.appendChild(dom_donation_alert_msg)

  dom_donation_alert.classList.toggle('pulse', true)
  dom_donation_alert.classList.toggle('hidden', false)
  dom_donation_alert.onanimationend = skip
}