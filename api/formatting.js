module.exports = function (faction) {
  var temp = {}
  temp = {
    id: faction.id,
    name: faction.name,
    description: faction.description,
    stats: {
      kills: parseInt(faction.kills),
      deaths: parseInt(faction.deaths),
      money: parseFloat(faction.money),
      ratio: 0
    },
    powers: {
      actual: parseInt(faction.power),
      max: parseInt(faction.powermax)
    },
    claims: {
      count: parseInt(faction.claim),
      outpost: parseInt(faction.outpost)
    },
    players: {
      list: faction.players.split(','),
      leader: faction.leader
    },
    events_wins: {
      wars: parseInt(faction.wars),
      totems: 0,
      kingzombie: 0,
      end: 0
    },
    points: faction.score
  }
  // calcul ratio
  if (faction.deaths > 0)
    temp.stats.ratio = (faction.kills / faction.deaths).toFixed()
  else
    temp.stats.ratio = faction.kills
  return temp
}
